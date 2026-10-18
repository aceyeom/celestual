# Keepsake economics model

The numbers in the Economics and Starting small tabs of [the master plan](../celestual-master-plan.md) come from these files.

- `model.py`: what one locket costs, what one order leaves on each channel and VAT status, and the launch budget.
- `analysis.py`: break-even, the three first-year cases, the sensitivity of the middle case, and monthly cash. It writes `econ.json`.
- `routes.py`: six ways to start making the locket, from a generic photo pocket watch to a case cast in Jongno, compared on cost per locket, what each order leaves, the launch budget, break-even, the minimum order and monthly cash. Its `checks` give the stock case built to the semi-custom spec, the engraving price at which it misses the cost target, engraving with your own fiber marker, the semi-custom route at outsourced engraving prices, and the cash low at a 60% payout. It writes `routes.json`.

Run them with `python3 analysis.py` and `python3 routes.py` from this folder. Most costs are estimates from the sourcing research in [../research](../research/), and no supplier has quoted yet. When quotes arrive, change `PARTS`, `PACK_SINGLE`, `PACK_PAIR` or `LAUNCH` in `model.py`, or a route's parts in `routes.py`, and run them again.

The timeline they assume: discharge in early April 2027, and the Wadiz presale from 14 June to 11 July 2027. Wadiz pays 70% of the presale when its payments complete, about two weeks after the close, and the rest after delivery; its guide says 60 to 80%. The stock case pays for the presale's cases on the close, before that payout, so `routes.py` also reports the low point in mid-July (`low_before_payout`); the semi-custom batch is ordered when the payout lands. The shop sells from October 2027.
