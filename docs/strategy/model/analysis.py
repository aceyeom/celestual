"""Scenarios, break-even, sensitivity and monthly cash for the keepsake. Run: python3 analysis.py
Writes econ.json next to this file. All money in KRW.

Timeline assumed (the plan, Phase 4 and 5): discharge in early April 2027; samples in April and May;
the presale on Wadiz from 14 June to 11 July 2027; 70% of it paid out in late July and the rest after delivery;
the first batch ordered then,
covering the presale plus two months of shop stock; presale orders shipped in late September;
the shop selling from October 2027. Year 1 = the presale plus the shop's first 12 months.
"""
import json, os
import model as m

B = dict(m.BASE)
L_SUB, L_CONT, L_TOTAL = m.launch_total()
TOOLS_MONTH = 45000  # the launch's 'Tools for six months', April to September 2027
WADIZ_ADVANCE = 0.7  # Wadiz pays 60 to 80% when the presale's payments complete, the rest after delivery and refunds


def per_order(a, channel, vat):
    """Contribution of an average order before content (the launch or the monthly budget pays for content)."""
    return m.blended(dict(a, vat=vat), channel, content=False)['left']


def year1(a, presale, shop, mkt_month, presale_vat='none', shop_vat=(('simplified', 1.0),), labour=0, paid=0.0):
    c_pre = per_order(a, 'wadiz', presale_vat)
    c_shop = sum(w * per_order(a, 'smartstore', v) for v, w in shop_vat)
    contrib = presale * c_pre + shop * c_shop
    rev = (presale + shop) * m.blended(a, 'wadiz')['price']
    profit = contrib - L_TOTAL - 12 * mkt_month - labour * (presale + shop) - paid * shop * a['cac_paid']
    return dict(presale=presale, shop=shop, orders=presale + shop, revenue=round(rev),
                contribution=round(contrib), profit=round(profit))


def launch_spent_by(month):
    """Launch money spent by the end of a month, excluding the contingency."""
    spent = sum(v for _, v, mo in m.LAUNCH if mo != 'monthly' and mo <= month)
    months_of_tools = len([x for x in ['2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09'] if x <= month])
    return spent + TOOLS_MONTH * months_of_tools


out = {}
out['locket'] = round(m.locket())
out['cogs'] = dict(single=round(m.cogs('single')), pair=round(m.cogs('pair')))
out['launch'] = dict(subtotal=L_SUB, contingency=L_CONT, total=L_TOTAL)

# What one order leaves, after content, by channel and VAT status
out['per_order'] = {}
for vat in ['none', 'simplified', 'general']:
    for ch in m.FEES:
        a = dict(B, vat=vat)
        out['per_order'][f'{vat}/{ch}'] = dict(single=m.unit(a, 'single', ch)['left'], pair=m.unit(a, 'pair', ch)['left'])
out['waterfall_pair_wadiz'] = m.unit(B, 'pair', 'wadiz')
out['waterfall_single_wadiz'] = m.unit(B, 'single', 'wadiz')
out['paid_order'] = {k: m.unit(dict(B, paid_share=1.0), k, 'wadiz')['left'] for k in ['single', 'pair']}

# Break-even on the launch budget: presale orders at full price, before content
pre = per_order(B, 'wadiz', 'none')
out['before_content_wadiz'] = round(pre)
out['before_content_smartstore'] = round(per_order(B, 'smartstore', 'none'))
out['signup_value'] = dict(at15=round(0.15 * pre), at10=round(0.10 * pre))
out['breakeven'] = dict(
    wadiz=round(L_TOTAL / pre),
    smartstore=round(L_TOTAL / per_order(B, 'smartstore', 'none')),
    all_singles=round(L_TOTAL / per_order(dict(B, pair_share=0.0), 'wadiz', 'none')),
    early_bird_10=round(L_TOTAL / per_order(dict(B, discount=0.10), 'wadiz', 'none')),
    early_bird_20=round(L_TOTAL / per_order(dict(B, discount=0.20), 'wadiz', 'none')),
    costs_30_over=round(L_TOTAL / per_order(dict(B, cogs_scale=1.3), 'wadiz', 'none')),
)

# Three cases for year 1
low_loss = -launch_spent_by('2027-07')
out['scen'] = dict(
    low=dict(presale=25, shop=0, orders=25, revenue=0, profit=low_loss,
             note='under 40 orders: the Wadiz goal is missed, nobody is charged, the object stops'),
    middle=year1(B, 100, 42 * 12, 300000),
    high=year1(B, 330, 2070, 1000000, presale_vat='simplified',
               shop_vat=(('simplified', 0.75), ('general', 0.25)), labour=4000),
)
out['low_if_charged_anyway'] = round(25 * pre - launch_spent_by('2027-07'))
out['orders_for_500M'] = round(500e6 / m.blended(B, 'wadiz')['price'])

# Sensitivity of the middle case's year-1 profit, one assumption at a time
base_profit = out['scen']['middle']['profit']


def prof(shop=504, paid=0.0, shop_vat=(('simplified', 1.0),), **kw):
    return year1(dict(B, **kw), 100, shop, 300000, shop_vat=shop_vat, paid=paid)['profit']


rows = [
    ('Orders after the presale', prof(shop=252), prof(shop=756), 'half as many, or half again (21 or 63 a month)'),
    ('Cost to make each piece', prof(cogs_scale=1.3), prof(cogs_scale=0.8), '30% over the estimates, or 20% under'),
    ('Price', prof(price_pair=119000, price_single=69000), prof(price_pair=159000, price_single=89000),
     'pair W119k or W159k, single W69k or W89k'),
    ('Share of orders that are pairs', prof(pair_share=0.3), prof(pair_share=0.8), '30% or 80%'),
    ('Shop orders bought with paid ads', prof(paid=0.3), base_profit, '30% at W45,000 each, or none'),
    ('VAT', prof(shop_vat=(('general', 1.0),)), prof(shop_vat=(('none', 1.0),)), 'general VAT, or none'),
    ('Defects and remakes', prof(defect_rate=0.12), prof(defect_rate=0.03), '12% or 3%'),
]
tornado = [dict(driver=n, low=round(min(lo, hi)), high=round(max(lo, hi)), note=t) for n, lo, hi, t in rows]
tornado.sort(key=lambda r: -(r['high'] - r['low']))
out['base_profit'] = base_profit
out['tornado'] = tornado

# Monthly cash, middle case
mid = dict(B)
o = m.blended(mid, 'wadiz')
payout = 100 * o['price'] * (1 - m.FEES['wadiz'])
making_per_order = o['making']
po1_orders = 100 + 2 * 42                      # the presale plus two months of shop stock
po1 = po1_orders * making_per_order
ship_presale = 100 * (mid['ship'] + mid['mailer'] + mid['defect_rate'] * (making_per_order + mid['return_ship']))
shop_month = 42 * per_order(mid, 'smartstore', 'simplified') - 300000


def launch_in(month):
    return sum(v for _, v, mo in m.LAUNCH if mo == month)


plan = [
    ('2026-10', 0, 'free tests only; the lawyer and accountant are paid separately'),
    ('2026-11', 0, ''), ('2026-12', 0, ''), ('2027-01', 0, ''), ('2027-02', 0, ''), ('2027-03', 0, ''),
    ('2027-04', -(launch_in('2027-04') + TOOLS_MONTH), 'discharge: registration, trademark, reference samples, CAD'),
    ('2027-05', -(launch_in('2027-05') + TOOLS_MONTH), 'custom samples, lab test, box proof, design'),
    ('2027-06', -(launch_in('2027-06') + TOOLS_MONTH), 'twelve early pieces, photos; the presale opens'),
    ('2027-07', WADIZ_ADVANCE * payout - po1 / 2 - TOOLS_MONTH,
     'Wadiz pays 70% of the presale; half the first batch is paid up front'),
    ('2027-08', -po1 / 2 - TOOLS_MONTH, 'the batch balance'),
    ('2027-09', -ship_presale - TOOLS_MONTH, 'presale orders finished in Seoul and shipped'),
    ('2027-10', (1 - WADIZ_ADVANCE) * payout + shop_month,
     'Wadiz pays the rest after delivery; the shop sells about 42 orders a month'),
    ('2027-11', shop_month, '11.11'), ('2027-12', shop_month, ''), ('2028-01', shop_month, ''), ('2028-02', shop_month, ''),
]
cum, cash = 0, []
for mo, net, note in plan:
    cum += net
    cash.append(dict(month=mo, net=round(net), cum=round(cum), note=note))
out['cash'] = cash
out['cash_facts'] = dict(payout=round(payout), advance=round(WADIZ_ADVANCE * payout),
                         balance=round((1 - WADIZ_ADVANCE) * payout), po1=round(po1), po1_orders=po1_orders,
                         po1_lockets=round(po1_orders * o['lockets']), ship_presale=round(ship_presale),
                         shop_month=round(shop_month), low=min(c['cum'] for c in cash),
                         low_month=min(cash, key=lambda c: c['cum'])['month'],
                         launch_spent_by_july=launch_spent_by('2027-07'))

if __name__ == '__main__':
    print(json.dumps(out, ensure_ascii=False, indent=1))
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'econ.json'), 'w'),
              ensure_ascii=False, indent=1)
