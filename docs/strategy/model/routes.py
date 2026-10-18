"""Ways to start making the keepsake, compared on cost, cash and time. Run: python3 routes.py
Writes routes.json next to this file. All money in KRW, VAT excluded unless stated.

Each route swaps the parts, the box and the launch budget in model.py and keeps everything else:
the prices, the platform fees, VAT, shipping, defects and content. Sources are in
docs/strategy/research/F-starting.md. No supplier has quoted: most lines are listing prices or estimates.
"""
import json, os
from contextlib import contextmanager
import model as m

USD = m.USD
TOOLS_MONTH = 45000          # as in analysis.py: tools for six months, April to September 2027
WADIZ_ADVANCE = 0.7          # Wadiz pays 60 to 80% when the presale's payments complete, the rest after delivery
PRESALE, SHOP = 100, 42      # the middle case: presale orders, then shop orders a month
SHOP_MARKETING = 300000


@contextmanager
def using(route):
    """Run model.py with one route's parts, box and overheads."""
    saved = (m.PARTS, m.PACK_SINGLE, m.PACK_PAIR, m.FREIGHT_DUTY, m.QC, m.SCRAP)
    m.PARTS, m.PACK_SINGLE, m.PACK_PAIR = route['parts'], route['pack_single'], route['pack_pair']
    m.FREIGHT_DUTY, m.QC, m.SCRAP = route['freight_duty'], route['qc'], route['scrap']
    try:
        yield
    finally:
        m.PARTS, m.PACK_SINGLE, m.PACK_PAIR, m.FREIGHT_DUTY, m.QC, m.SCRAP = saved


def parts(case, finish=0, dial=0, hands=0, glass=0, photo=0, chain=0, engrave_back=0, engrave_inside=0):
    return dict(case=case, finish=finish, dial=dial, hands=hands, glass=glass, photo=photo, chain=chain,
                engrave_back=engrave_back, engrave_inside=engrave_inside)


STOCK_BOX_SINGLE = dict(card=700, nfc=600, wax=400, box=3500, pouch=500)    # stock drawer box with a printed sleeve
STOCK_BOX_PAIR = dict(card=1400, nfc=1200, wax=800, box=4500, pouch=1000)

# The launch items every route shares, from model.LAUNCH
SHARED = [
    ('Trademark, classes 14 and 35, filed yourself', 546000, '2027-04'),
    ('Registration fees and local tax', 50000, '2027-04'),
    ('Lab tests for lead, cadmium and nickel', 500000, '2027-05'),
    ('Photography and props', 200000, '2027-06'),
    ('Tools for six months', 270000, 'monthly'),
]
# Small-lot routes test two factories' cases, a chain and a clasp first: four materials at an estimated
# W150,000-400,000 each. Their QC line also carries a lab re-test of one monthly lot in three.
SMALL_LOT = [x if not x[0].startswith('Lab tests') else
             ('Lab tests for lead, cadmium and nickel: two cases, a chain and a clasp', 1000000, '2027-05')
             for x in SHARED]
SMALL_LOT_QC = 3000

ROUTES = {
    'generic': dict(
        label='Generic photo pocket watch, bought in and engraved',
        parts=parts(case=2.5 * USD,            # quartz pocket watch with chain, $1.42-3.90 at 5-10 pieces (Alibaba)
                    engrave_back=8000),        # the photo lasered on the outer lid, by a Seoul shop
        freight_duty=1500, qc=SMALL_LOT_QC, scrap=0.05,
        pack_single=dict(card=700, nfc=600, wax=400, box=1000, pouch=0),
        pack_pair=dict(card=1400, nfc=1200, wax=800, box=1500, pouch=0),
        price_single=45000, price_pair=79000,  # what a photo watch can carry: Korea's nearest is W59,000 on a stand
        minimum=10, weeks=2, wadiz=False,
        launch=[('Samples of three watches, by express', 150000, '2027-04')] + SMALL_LOT,
    ),
    'stock_locket': dict(
        label='Stock watch-shaped photo locket from 1688, finished in Seoul',
        parts=parts(case=13 * 205 * 1.15,      # about 13 RMB, plus a 5-10% agent fee and 4-6% on exchange
                    dial=200, hands=300, glass=300, photo=200, chain=1500, engrave_back=8000),
        freight_duty=1800, qc=SMALL_LOT_QC, scrap=0.10,
        pack_single=STOCK_BOX_SINGLE, pack_pair=STOCK_BOX_PAIR,
        price_single=79000, price_pair=139000,
        minimum=10, weeks=3, wadiz=False,
        launch=[('Prototype kit: stock bodies of four kinds, two or three of each', 200000, '2027-04'),
                ('Printing and fitting tools', 350000, '2027-04')] + SMALL_LOT,
    ),
    'steel_round': dict(
        label='Round 316L steel locket with two glass windows, finished in Seoul',
        parts=parts(case=2.0 * USD,            # 20-30 mm floating lockets, $0.80-9 at 10-100 pieces
                    dial=200, hands=300, photo=200, chain=1500, engrave_back=6000),
        freight_duty=1500, qc=SMALL_LOT_QC, scrap=0.07,
        pack_single=STOCK_BOX_SINGLE, pack_pair=STOCK_BOX_PAIR,
        price_single=79000, price_pair=139000,
        minimum=20, weeks=3, wadiz=True,
        launch=[('Prototype kit: stock bodies of four kinds, two or three of each', 200000, '2027-04'),
                ('Printing and fitting tools', 350000, '2027-04'),
                ('Samples with your mark lasered on, from two factories', 200000, '2027-04'),
                ('Box samples and a sleeve proof', 50000, '2027-05'),
                ('Twelve pieces made ahead: 10 for creators, 2 to film, shipped', 330000, '2027-06')] + SMALL_LOT,
    ),
    'stock_case': dict(
        label="A factory's stock hunter case, empty, your lid lasered on, finished in Seoul",
        parts=parts(case=4 * USD,              # est. $3-6: an empty brass case with the lid pattern lasered at the factory
                    finish=1000,               # clear lacquer, by the factory or in Seoul
                    dial=500, hands=300, glass=500, photo=300, chain=2000,
                    engrave_back=6000,         # one unique job at a Jongno 3-ga shop; W5,000-12,000 for small jobs
                    engrave_inside=0),         # the two handwritten lines are printed around the photo at first
        freight_duty=1500, qc=SMALL_LOT_QC, scrap=0.10,
        pack_single=STOCK_BOX_SINGLE, pack_pair=STOCK_BOX_PAIR,
        price_single=79000, price_pair=139000,
        minimum=10, weeks=3, wadiz=True,
        launch=[('Prototype kit: stock bodies of four kinds, two or three of each', 200000, '2027-04'),
                ('Printing and fitting tools', 350000, '2027-04'),
                ('Case samples with your lid lasered on, from two factories, by express', 300000, '2027-04'),
                ('Box samples and a sleeve proof', 50000, '2027-05'),
                ('Design registration of the lid and dial, filed yourself', 150000, '2027-05'),
                ('Twelve pieces made ahead: 10 for creators, 2 to film, shipped', 360000, '2027-06')] + SMALL_LOT,
    ),
    'semi_custom': dict(
        label='Semi-custom brass case from a Chinese factory (the plan until now)',
        parts=dict(m.PARTS), freight_duty=m.FREIGHT_DUTY, qc=m.QC, scrap=m.SCRAP,
        pack_single=dict(m.PACK_SINGLE), pack_pair=dict(m.PACK_PAIR),
        price_single=79000, price_pair=139000,
        minimum=100, weeks=8, wadiz=True,
        launch=list(m.LAUNCH),
    ),
    'cast_seoul': dict(
        label='Your own case, lost-wax cast in Jongno',
        parts=parts(case=17500,                # est. W10,000-25,000 a case
                    finish=1500, dial=800, hands=300, glass=500, photo=800, chain=2000,
                    engrave_back=3000, engrave_inside=4000),
        freight_duty=0, qc=1500, scrap=0.07,
        pack_single=dict(m.PACK_SINGLE), pack_pair=dict(m.PACK_PAIR),
        price_single=79000, price_pair=139000,
        minimum=30, weeks=14, wadiz=True,
        launch=[('CAD model, 3D-printed masters and first casts', 600000, '2027-04'),
                ('Box proof and foil die', 150000, '2027-05'),
                ('Design registration, filed yourself', 150000, '2027-05'),
                ('Twelve pieces made ahead: 10 for creators, 2 to film, shipped', 700000, '2027-06')] + SHARED,
    ),
}


def launch_total(route):
    sub = sum(v for _, v, _ in route['launch'])
    return sub, round(sub * (1 + m.CONTINGENCY))


def launch_in(route, month):
    return sum(v for _, v, mo in route['launch'] if mo == month)


def summary(r, key=None):
    a = dict(m.BASE, price_single=r['price_single'], price_pair=r['price_pair'])
    with using(r):
        locket = m.locket()
        single, pair = m.cogs('single'), m.cogs('pair')
        pre = m.blended(a, 'wadiz', content=False)
        shop = m.blended(dict(a, vat='simplified'), 'smartstore', content=False)
        per_order = {k: m.unit(a, k, 'wadiz')['left'] for k in ['single', 'pair']}
    sub, total = launch_total(r)
    return dict(key=key, label=r['label'], locket=round(locket), single=round(single), pair=round(pair),
                parts=dict(r['parts']), price_single=r['price_single'], price_pair=r['price_pair'],
                per_order_wadiz=per_order, before_content_wadiz=round(pre['left']),
                making_per_order=round(pre['making']), lockets_per_order=pre['lockets'],
                price_avg=round(pre['price']), shop_per_order=round(shop['left']),
                launch=total, breakeven=round(total / pre['left']),
                first_lot=round(r['minimum'] * locket), minimum=r['minimum'], weeks=r['weeks'], wadiz=r['wadiz'])


def variant(key, parts=None, **changes):
    """A copy of a route with some parts or settings changed."""
    r = dict(ROUTES[key], **changes)
    r['parts'] = dict(ROUTES[key]['parts'], **(parts or {}))
    return r


LASER = 2500000  # a generic 20-30 W fiber marker, est. W1.5-3.5M including shipping, duty and VAT


def cash(r, shop_float_months, advance=WADIZ_ADVANCE, marker_in=None):
    """Monthly cash for the middle case: 100 presale orders, then 42 shop orders a month from October.

    A short route orders the presale's cases on the close and pays on order. A route with a long lead time orders
    its batch when Wadiz's first payout lands, with shop stock ahead (shop_float_months), and pays half then and
    half the next month. advance is the share Wadiz pays first; marker_in is the month a fiber marker is bought.
    """
    s = summary(r)
    payout = PRESALE * s['price_avg'] * (1 - m.FEES['wadiz'])
    making = s['making_per_order']
    with using(r):
        a = dict(m.BASE, price_single=r['price_single'], price_pair=r['price_pair'])
        ship_presale = PRESALE * (a['ship'] + a['mailer'] + a['defect_rate'] * (making + a['return_ship']))
    shop_month = SHOP * s['shop_per_order'] - SHOP_MARKETING
    months = []
    for mo in ['2027-04', '2027-05', '2027-06']:
        months.append((mo, -(launch_in(r, mo) + TOOLS_MONTH)))
    batch = (PRESALE + shop_float_months * SHOP) * making
    if r['weeks'] >= 6:
        months += [('2027-07', advance * payout - batch / 2 - TOOLS_MONTH),
                   ('2027-08', -batch / 2 - TOOLS_MONTH),
                   ('2027-09', -ship_presale - TOOLS_MONTH),            # shipped in late September
                   ('2027-10', (1 - advance) * payout + shop_month)]
    else:
        months += [('2027-07', advance * payout - PRESALE * making - TOOLS_MONTH),
                   ('2027-08', -ship_presale - TOOLS_MONTH),            # shipped in late August
                   ('2027-09', (1 - advance) * payout - shop_float_months * SHOP * making - TOOLS_MONTH),
                   ('2027-10', shop_month)]
    months += [(mo, shop_month) for mo in ['2027-11', '2027-12', '2028-01', '2028-02']]
    if marker_in:
        months = [(mo, net - LASER if mo == marker_in else net) for mo, net in months]
    cum, out = 0, []
    for mo, net in months:
        cum += net
        out.append(dict(month=mo, net=round(net), cum=round(cum)))
    low = min(out, key=lambda c: c['cum'])
    back = next((c['month'] for c in out if c['cum'] >= 0 and c['month'] > low['month']), None)
    res = dict(months=out, low=low['cum'], low_month=low['month'], back_above_zero=back,
               payout=round(payout), batch=round(batch if r['weeks'] >= 6 else PRESALE * making))
    if r['weeks'] < 6:
        # A short route pays for the presale's cases on the close, VAT included, about two weeks before Wadiz's
        # first payout lands. A long route orders its batch when the payout lands, so it has no such dip.
        p = r['parts']
        cases = round(PRESALE * s['lockets_per_order'] * 1.1) * (p['case'] + p['finish'] + r['freight_duty']) * 1.1
        june = next(c['cum'] for c in out if c['month'] == '2027-06')
        res.update(cases_before_payout=round(cases), low_before_payout=round(june - cases))
    res['lowest'] = min(res['low'], res.get('low_before_payout', res['low']))
    return res


out = dict(rate=USD, wadiz_advance=WADIZ_ADVANCE, routes={k: summary(r, k) for k, r in ROUTES.items()})
out['cash'] = dict(semi_custom=cash(ROUTES['semi_custom'], 2), stock_case=cash(ROUTES['stock_case'], 1))
# If the presale misses its goal, the loss is the launch money spent by July. If Wadiz charged 25 backers anyway,
# the 25 orders are made and shipped, and the semi-custom route must still buy its minimum of 100 cases.
for k in ['semi_custom', 'stock_case']:
    r = ROUTES[k]
    spent = sum(v for _, v, mo in r['launch'] if mo != 'monthly' and mo <= '2027-07') + 4 * TOOLS_MONTH
    out['cash'][k]['loss_if_presale_fails'] = spent
    s = out['routes'][k]
    unused = max(0, r['minimum'] - 25 * s['lockets_per_order'])
    case_cost = (r['parts']['case'] + r['parts']['finish']) * (1 + r['scrap']) + r['freight_duty']
    out['cash'][k]['loss_if_25_charged'] = round(spent - 25 * s['before_content_wadiz'] + unused * case_cost * 1.1)

# Checks on the stock case: like for like, the engraving price that sinks it, and engraving in-house
stock, semi = ROUTES['stock_case'], out['routes']['semi_custom']
# Built to the semi-custom spec: the same engraving prices, the handwriting engraved, the custom box
like = summary(variant('stock_case', parts=dict(engrave_back=m.PARTS['engrave_back'],
                                                engrave_inside=m.PARTS['engrave_inside']),
                       pack_single=dict(m.PACK_SINGLE), pack_pair=dict(m.PACK_PAIR)))
gap = semi['locket'] - out['routes']['stock_case']['locket']
threshold = stock['parts']['engrave_back'] + gap / (1 + stock['scrap'])
case_threshold = stock['parts']['case'] / USD + gap / (USD * (1 + stock['scrap']))
at6 = summary(variant('stock_case', parts=dict(case=6 * USD)))
at11 = summary(variant('stock_case', parts=dict(engrave_back=11000)))
inhouse = summary(variant('stock_case', parts=dict(engrave_back=300, engrave_inside=500)))
semi6 = variant('semi_custom', parts=dict(engrave_back=6000, engrave_inside=6000))
semi_marker = variant('semi_custom', parts=dict(engrave_back=300, engrave_inside=500))
out['checks'] = dict(
    like_for_like=dict(locket=like['locket'], single=like['single'], breakeven=like['breakeven']),
    engraving_threshold=round(threshold),
    # The case price at which the stock case costs as much as the semi-custom locket, and two dearer cases:
    # a $6 case, and engraving at Soomgo's average of W11,000 a job
    case_threshold_usd=round(case_threshold, 2),
    case_at_6_usd=dict(locket=at6['locket'], breakeven=at6['breakeven']),
    engraving_at_11000=dict(locket=at11['locket'], breakeven=at11['breakeven']),
    in_house=dict(locket=inhouse['locket'], single=inhouse['single'],
                  per_order_wadiz=inhouse['per_order_wadiz'], marker=LASER,
                  saving_per_order=round(inhouse['before_content_wadiz'] - out['routes']['stock_case']['before_content_wadiz']),
                  payback_orders=round(LASER / (inhouse['before_content_wadiz'] - out['routes']['stock_case']['before_content_wadiz']))),
    semi_custom_at_6000=dict(locket=summary(semi6)['locket'], breakeven=summary(semi6)['breakeven'],
                             low=cash(semi6, 2)['low']),
    semi_custom_low_at_60=cash(ROUTES['semi_custom'], 2, advance=0.6)['low'],
    # The fallback as the plan would run it: engraving in-house, the marker bought in August
    semi_custom_with_marker=dict(locket=summary(semi_marker)['locket'],
                                 low=cash(semi_marker, 2, marker_in='2027-08')['low'],
                                 low_at_60=cash(semi_marker, 2, advance=0.6, marker_in='2027-08')['low']),
    stock_lowest_at_60=cash(stock, 1, advance=0.6)['lowest'],
    stock_with_marker_in_august=dict([(k, v) for k, v in cash(stock, 1, marker_in='2027-08').items()
                                      if k in ('low', 'low_month', 'lowest', 'back_above_zero')]
                                     + [('lowest_at_60', cash(stock, 1, advance=0.6, marker_in='2027-08')['lowest'])]),
    # The stock case's mid-July dip grows with the presale: each 10 orders above 100 adds this much in cases
    dip_per_10_orders=round(out['cash']['stock_case']['cases_before_payout'] / 10),
)

if __name__ == '__main__':
    for k, s in out['routes'].items():
        print(f"{k:13} locket {s['locket']:>7,} single {s['single']:>7,} pair {s['pair']:>7,} | "
              f"wadiz single {s['per_order_wadiz']['single']:>7,} pair {s['per_order_wadiz']['pair']:>7,} | "
              f"launch {s['launch']:>9,} breakeven {s['breakeven']:>4} | min {s['minimum']:>3} weeks {s['weeks']:>2}")
    for k, c in out['cash'].items():
        print(k, 'low', f"{c['low']:,}", c['low_month'], 'back', c['back_above_zero'], 'batch', f"{c['batch']:,}",
              'fail', f"{c['loss_if_presale_fails']:,}", '25 charged', f"{c['loss_if_25_charged']:,}",
              'before payout', c.get('low_before_payout'))
        print('   ', [(x['month'][2:], x['cum']) for x in c['months']])
    print(json.dumps(out['checks'], indent=1))
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'routes.json'), 'w'),
              ensure_ascii=False, indent=1)
