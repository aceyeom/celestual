"""
나무증권 무한매수법 (Namuh Securities "Infinite Buy") — 5-year backtest engine.

This module (a) reconstructs the daily OHLC path of a 3x leveraged ETF from its
underlying ETF, and (b) runs a faithful day-by-day simulation of the strategy the
user described.

WHY RECONSTRUCTION
------------------
This sandbox cannot reach any live market-data API (Yahoo/Stooq/etc. are all
blocked by the egress policy). The only real, verifiable daily data reachable is
QQQ and SPY daily OHLCV (through 2026-10-02) from a public GitHub dataset.
A 3x leveraged ETF targets 3x the *daily* return of its index, so its close path
can be reconstructed with good fidelity from the underlying ETF's daily returns,
minus the fund's expense ratio and the financing cost of the borrowed 2x.

  TQQQ  <-  QQQ   (3x NASDAQ-100)
  UPRO  <-  SPY   (3x S&P 500)

Intraday high/low of the leveraged series are approximated by scaling the
underlying's within-day move (relative to the prior close) by 3x. This is an
approximation and is only used for order-fill logic.

ASSUMPTIONS (all documented, all adjustable at the top of the file):
  * The account is run PER TICKER (each ETF gets its own dedicated "infinite buy"
    account), which is how the method is actually practised and which makes every
    cash-ratio rule self-consistent. The combined portfolio is reported too.
  * Everything is computed in fractional/percentage terms. The user's "1% = 400,000
    KRW" simply means the account is divided into 100 units; the strategy's % return
    is independent of USD/KRW, so FX is not modelled (stated in the report).
  * Costs: expense ratio + financing on the 2x borrowed notional, using an
    approximate monthly effective-fed-funds schedule (see RATE_SCHEDULE). The
    2026 portion (after the model's knowledge cutoff) is held flat and flagged.
  * Fills: market buys fill at the day's open; avg-cost limit buys fill at the
    limit if the day's low reaches it; take-profit sells fill at the target if the
    day's high reaches it (or at the open if the open already gaps past it).
"""

from __future__ import annotations
import json
import math
from dataclasses import dataclass, field
import pandas as pd
import numpy as np

# ----------------------------------------------------------------------------
# Fund parameters
# ----------------------------------------------------------------------------
FUNDS = {
    "TQQQ": {"underlying": "QQQ", "leverage": 3.0, "expense": 0.0084},
    "UPRO": {"underlying": "SPY", "leverage": 3.0, "expense": 0.0091},
}

# Approximate month-start effective federal funds rate (annualised, decimal).
# Used for the financing drag on the borrowed 2x notional. Values before 2026 are
# the well-known FOMC path; 2026 is held flat at the last 2025 level and FLAGGED as
# an assumption (post knowledge-cutoff).
RATE_SCHEDULE = [
    ("2021-01-01", 0.0008), ("2022-01-01", 0.0008), ("2022-03-17", 0.0033),
    ("2022-05-05", 0.0077), ("2022-06-16", 0.0158), ("2022-07-28", 0.0233),
    ("2022-09-22", 0.0308), ("2022-11-03", 0.0383), ("2022-12-15", 0.0433),
    ("2023-02-02", 0.0458), ("2023-03-23", 0.0483), ("2023-05-04", 0.0508),
    ("2023-07-27", 0.0533), ("2024-09-19", 0.0483), ("2024-11-08", 0.0458),
    ("2024-12-19", 0.0433), ("2025-01-01", 0.0433), ("2025-09-18", 0.0408),
    ("2026-01-01", 0.0383),  # post-cutoff: held ~flat, ASSUMPTION
]
FINANCING_SPREAD = 0.005  # broker spread over fed funds on borrowed notional

START = "2021-10-01"   # ~5 years back from 2026-10-02 (last available data)
END = "2026-10-02"


def _rate_on(date: pd.Timestamp) -> float:
    r = RATE_SCHEDULE[0][1]
    for d, v in RATE_SCHEDULE:
        if date >= pd.Timestamp(d):
            r = v
        else:
            break
    return r


def load_underlying(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["Date"]).sort_values("Date").reset_index(drop=True)
    return df[["Date", "Open", "High", "Low", "Close"]]


def reconstruct(underlying: pd.DataFrame, leverage: float, expense: float) -> pd.DataFrame:
    """Reconstruct a leveraged ETF's daily OHLC from the underlying ETF."""
    u = underlying.copy()
    prev_close = u["Close"].shift(1)
    # within-day moves measured from the prior close
    open_ret = u["Open"] / prev_close - 1.0
    high_ret = u["High"] / prev_close - 1.0
    low_ret = u["Low"] / prev_close - 1.0
    close_ret = u["Close"] / prev_close - 1.0

    rows = []
    lev_close = 100.0  # arbitrary starting NAV; strategy is scale-free
    borrowed = leverage - 1.0
    for i in range(len(u)):
        date = u["Date"].iloc[i]
        if i == 0 or pd.isna(close_ret.iloc[i]):
            rows.append((date, np.nan, np.nan, np.nan, lev_close))
            continue
        daily_cost = (expense + borrowed * (_rate_on(date) + FINANCING_SPREAD)) / 252.0
        o = lev_close * (1 + leverage * open_ret.iloc[i])
        hi = lev_close * (1 + leverage * high_ret.iloc[i])
        lo = lev_close * (1 + leverage * low_ret.iloc[i])
        c = lev_close * (1 + leverage * close_ret.iloc[i] - daily_cost)
        # keep ordering sane (reconstruction can invert hi/lo vs o/c slightly)
        hi = max(hi, o, c)
        lo = min(lo, o, c)
        rows.append((date, o, hi, lo, c))
        lev_close = c
    out = pd.DataFrame(rows, columns=["Date", "Open", "High", "Low", "Close"])
    return out


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    # Wilder's smoothing
    avg_gain = gain.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out = 100 - (100 / (1 + rs))
    out = out.where(avg_loss != 0, 100.0)
    return out


def weekly_rsi_aligned(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Weekly RSI(14) computed on Friday-week closes, forward-filled onto daily
    dates using only *completed* weeks (shifted by one week)."""
    s = df.set_index("Date")["Close"]
    wk = s.resample("W-FRI").last().dropna()
    wk_rsi = rsi(wk, period)
    # a given day may only use the most recently COMPLETED week's RSI
    wk_rsi_shift = wk_rsi.shift(1)
    daily = wk_rsi_shift.reindex(s.index, method="ffill")
    return daily


# ----------------------------------------------------------------------------
# Strategy simulation
# ----------------------------------------------------------------------------
@dataclass
class Account:
    capital: float = 100.0          # 100 units; 1 unit == "1% == 400,000 KRW"
    cash: float = 100.0
    shares: float = 0.0
    cost_basis: float = 0.0         # total cash spent on current shares (for avg)
    # bookkeeping
    realized: float = 0.0
    n_entries: int = 0
    n_full_exits_10: int = 0
    n_exits_5: int = 0
    n_budget_sells: int = 0
    days_in_market: int = 0

    @property
    def avg(self) -> float:
        return self.cost_basis / self.shares if self.shares > 0 else 0.0

    def position_value(self, price: float) -> float:
        return self.shares * price

    def equity(self, price: float) -> float:
        return self.cash + self.position_value(price)


UNIT = 1.0  # one "1%" buy == 1 unit of the 100-unit account


def simulate(lev: pd.DataFrame, rsi_d: pd.Series, rsi_w: pd.Series,
             verbose: bool = False) -> dict:
    acc = Account()
    equity_curve = []
    prev_close = None

    for i in range(len(lev)):
        date = lev["Date"].iloc[i]
        o, hi, lo, c = (lev["Open"].iloc[i], lev["High"].iloc[i],
                        lev["Low"].iloc[i], lev["Close"].iloc[i])
        if pd.isna(o) or o <= 0:
            prev_close = c
            equity_curve.append((date, acc.equity(c if not pd.isna(c) else 0)))
            continue

        start_equity = acc.equity(o)
        cash_ratio = acc.cash / start_equity if start_equity > 0 else 1.0

        # ---- 1. Exit checks at/through the day (take profit) ----
        if acc.shares > 0:
            avg = acc.avg
            target10 = avg * 1.10
            target5 = avg * 1.05
            # +10% full liquidation (primary)
            if hi >= target10:
                fill = max(o, target10)  # if gapped open above, fill at open
                acc.realized += acc.shares * fill - acc.cost_basis
                acc.cash += acc.shares * fill
                acc.shares = 0.0
                acc.cost_basis = 0.0
                acc.n_full_exits_10 += 1
                equity_curve.append((date, acc.equity(c)))
                prev_close = c
                continue
            # cash<=15% and +5%  -> exit (secondary)
            if cash_ratio <= 0.15 and hi >= target5:
                fill = max(o, target5)
                acc.realized += acc.shares * fill - acc.cost_basis
                acc.cash += acc.shares * fill
                acc.shares = 0.0
                acc.cost_basis = 0.0
                acc.n_exits_5 += 1
                equity_curve.append((date, acc.equity(c)))
                prev_close = c
                continue

        # ---- 2. Buy logic ----
        def buy(price: float, units: float):
            amount = units * UNIT
            # "budget exhausted" -> raise cash by selling 15% of shares at open
            if amount > acc.cash + 1e-9 and acc.shares > 0:
                sell_sh = acc.shares * 0.15
                proceeds = sell_sh * o
                # realized P&L on the slice, reduce basis proportionally
                acc.realized += proceeds - acc.cost_basis * 0.15
                acc.cost_basis *= 0.85
                acc.shares -= sell_sh
                acc.cash += proceeds
                acc.n_budget_sells += 1
            amount = min(amount, acc.cash)
            if amount <= 1e-9 or price <= 0:
                return
            sh = amount / price
            acc.shares += sh
            acc.cost_basis += amount
            acc.cash -= amount

        if acc.shares == 0:
            # ENTRY — gated by RSI
            rd = rsi_d.iloc[i]
            rw = rsi_w.iloc[i]
            blocked = False
            if not pd.isna(rd) and not pd.isna(rw):
                if rd >= 70 or rw >= 70 or (rd >= 60 and rw >= 60):
                    blocked = True
            if not blocked and not pd.isna(rd):
                buy(o, 1.0)
                acc.n_entries += 1
        else:
            avg = acc.avg
            loss_rate = (avg - o) / avg  # positive => currently at a loss
            big_loss = loss_rate >= 0.10
            if cash_ratio >= 0.75:
                if o <= avg:
                    buy(o, 2.0 if big_loss else 1.0)
                else:
                    # limit buy at avg; fills if low reaches it
                    if lo <= avg:
                        buy(avg, 1.0)
                    else:
                        # unfilled: if return at close <= 5%, buy 0.5% at close
                        ret_close = (c - avg) / avg
                        if ret_close <= 0.05:
                            buy(c, 0.5)
            elif cash_ratio >= 0.50:
                if o <= avg:
                    buy(o, 2.0 if big_loss else 1.0)
            elif cash_ratio >= 0.25:
                if o <= avg and prev_close is not None and o <= prev_close:
                    buy(o, 1.0)
            else:
                if o <= avg and prev_close is not None and o <= prev_close:
                    buy(o, 0.5)

        if acc.shares > 0:
            acc.days_in_market += 1
        equity_curve.append((date, acc.equity(c)))
        prev_close = c

    eq = pd.DataFrame(equity_curve, columns=["Date", "Equity"]).set_index("Date")
    final_price = lev["Close"].iloc[-1]
    final_equity = acc.equity(final_price)
    return {"account": acc, "equity": eq, "final_equity": final_equity}


def metrics(eq: pd.DataFrame, start_cap: float = 100.0) -> dict:
    e = eq["Equity"]
    total_ret = e.iloc[-1] / start_cap - 1.0
    days = (eq.index[-1] - eq.index[0]).days
    years = days / 365.25
    cagr = (e.iloc[-1] / start_cap) ** (1 / years) - 1.0 if years > 0 else np.nan
    roll_max = e.cummax()
    dd = e / roll_max - 1.0
    mdd = dd.min()
    daily_ret = e.pct_change().dropna()
    vol = daily_ret.std() * math.sqrt(252)
    sharpe = (daily_ret.mean() * 252) / (daily_ret.std() * math.sqrt(252)) if daily_ret.std() > 0 else np.nan
    return {"total_return": total_ret, "cagr": cagr, "mdd": mdd,
            "vol": vol, "sharpe": sharpe, "years": years}


def buy_and_hold(lev: pd.DataFrame, start_cap: float = 100.0) -> pd.DataFrame:
    first = lev["Close"].iloc[0]
    eq = (lev.set_index("Date")["Close"] / first) * start_cap
    return eq.to_frame("Equity")


def run():
    results = {}
    curves = {}
    for tkr, p in FUNDS.items():
        underlying = load_underlying(f"data/{p['underlying']}.csv")
        underlying = underlying[(underlying["Date"] >= START) & (underlying["Date"] <= END)].reset_index(drop=True)
        lev = reconstruct(underlying, p["leverage"], p["expense"])
        rsi_d = rsi(lev["Close"], 14)
        rsi_w = weekly_rsi_aligned(lev, 14).reset_index(drop=True)
        sim = simulate(lev, rsi_d, rsi_w)
        m = metrics(sim["equity"])
        bh = buy_and_hold(lev)
        mbh = metrics(bh)
        acc = sim["account"]
        results[tkr] = {
            "underlying": p["underlying"],
            "period": [str(lev["Date"].iloc[0].date()), str(lev["Date"].iloc[-1].date())],
            "strategy": {**m, "final": sim["final_equity"]},
            "buy_hold": {**mbh, "final": float(bh["Equity"].iloc[-1])},
            "trades": {
                "entries": acc.n_entries,
                "full_exits_+10%": acc.n_full_exits_10,
                "exits_+5%_lowcash": acc.n_exits_5,
                "budget_15%_sells": acc.n_budget_sells,
                "days_in_market": acc.days_in_market,
                "total_days": len(lev),
            },
            "leveraged_recon": {
                "start_close": float(lev["Close"].iloc[0]),
                "end_close": float(lev["Close"].iloc[-1]),
                "max_drawdown_recon": float((lev.set_index("Date")["Close"] /
                                             lev.set_index("Date")["Close"].cummax() - 1).min()),
            },
        }
        curves[tkr] = {
            "strategy": sim["equity"]["Equity"],
            "buy_hold": bh["Equity"],
            "lev_close": lev.set_index("Date")["Close"],
            "underlying_close": underlying.set_index("Date")["Close"],
        }

    # Combined 50/50 portfolio (rebalance-free: just sum two independent accounts)
    idx = curves["TQQQ"]["strategy"].index.union(curves["UPRO"]["strategy"].index)
    comb_strat = sum(curves[t]["strategy"].reindex(idx).ffill() for t in FUNDS) / len(FUNDS)
    comb_bh = sum(curves[t]["buy_hold"].reindex(idx).ffill() for t in FUNDS) / len(FUNDS)
    results["COMBINED_50_50"] = {
        "strategy": {**metrics(comb_strat.to_frame("Equity")), "final": float(comb_strat.iloc[-1])},
        "buy_hold": {**metrics(comb_bh.to_frame("Equity")), "final": float(comb_bh.iloc[-1])},
    }

    # persist equity curves for charting
    export = pd.DataFrame({
        "date": [d.strftime("%Y-%m-%d") for d in idx],
        "tqqq_strategy": curves["TQQQ"]["strategy"].reindex(idx).ffill().round(3).values,
        "tqqq_hold": curves["TQQQ"]["buy_hold"].reindex(idx).ffill().round(3).values,
        "upro_strategy": curves["UPRO"]["strategy"].reindex(idx).ffill().round(3).values,
        "upro_hold": curves["UPRO"]["buy_hold"].reindex(idx).ffill().round(3).values,
        "combined_strategy": comb_strat.round(3).values,
        "combined_hold": comb_bh.round(3).values,
    })
    export.to_csv("results_equity_curves.csv", index=False)
    with open("results.json", "w") as f:
        json.dump(results, f, indent=2, default=float)
    return results


if __name__ == "__main__":
    res = run()
    print(json.dumps(res, indent=2, default=lambda x: round(float(x), 4)))
