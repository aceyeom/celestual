"""Celestual keepsake economics: what one order earns and what the launch costs. All money in KRW.

Run `python3 analysis.py` for the scenarios, break-even, sensitivity and monthly cash.
Sources are the research notes in docs/strategy/research: B-making.md for parts and lead times,
C-legal-commerce.md for VAT and platform fees, D-marketing.md for Wadiz and ad costs.
No supplier has quoted yet: most cost lines are estimates. Replace them with quotes as they arrive.
"""

USD = 1480  # won per dollar, the one rate used across the plan

# Per locket, VAT excluded, base case at 100 to 300 units (B-making.md, section e).
PARTS = dict(
    case=5 * USD,          # semi-custom brass hunter case from a Chinese factory, about $5 (est.)
    finish=1500,           # polished brass under a clear e-coat, no gold (est.)
    dial=800,              # cream Roman-numeral dial, printed
    hands=300,             # fixed hands, glued at the couple's time
    glass=500,             # two domed mineral glasses
    photo=800,             # the couple's own photo, trimmed and fitted
    chain=2000,            # short chain, trigger clasp and rings
    engrave_back=3000,     # one short line on the back, Seoul shop, per piece (est.)
    engrave_inside=4000,   # the handwriting ring inside the lid, two short lines (est., no quote)
)
FREIGHT_DUTY = 1000        # freight from China and 8% Korean duty, per locket
QC = 1500                  # quality checks, plus a lab re-test for each later batch (the first test is in LAUNCH)
SCRAP = 0.07               # scrap and spares, as a share of the parts

PACK_SINGLE = dict(card=700, nfc=600, wax=400, box=8000, pouch=500)
PACK_PAIR = dict(card=1400, nfc=1200, wax=800, box=10000, pouch=1000)


def locket(scale=1.0):
    parts = sum(PARTS.values())
    return (parts * (1 + SCRAP) + FREIGHT_DUTY + QC) * scale


def cogs(kind, scale=1.0):
    """Cost to make one boxed order, VAT excluded."""
    if kind == 'single':
        return locket(scale) + sum(PACK_SINGLE.values()) * scale
    return 2 * locket(scale) + sum(PACK_PAIR.values()) * scale


BASE = dict(
    price_single=79000, price_pair=139000, pair_share=0.55,
    discount=0.0,             # early-bird discount on the presale price
    vat='none',               # 'none' (simplified, under W48M a year), 'simplified' (1.5% of sales), 'general'
    ship=3000, mailer=300,    # home delivery via a contract courier, plus the mailer
    defect_rate=0.05, return_ship=6000,
    content=7000,             # content per order from our own posts: props, gifts, tools (assumption)
    cac_paid=45000,           # paid social per order in Korea; D-marketing.md puts it at W25,000 to W130,000
    paid_share=0.0,
    cogs_scale=1.0,
)

# Platform fees as a share of the price. Wadiz Basic is 10% plus VAT on the fee.
FEES = dict(wadiz=0.11, smartstore=0.0663, own_site=0.0374)


def unit(a, kind, channel, content=True):
    """What one order leaves after making, VAT, the fee, shipping, defects and (optionally) content."""
    list_price = a['price_single'] if kind == 'single' else a['price_pair']
    price = list_price * (1 - a['discount'])
    c = cogs(kind, a['cogs_scale'])
    if a['vat'] == 'general':
        vat = price / 11                       # output VAT; input VAT on parts, fees and shipping is reclaimed
        making, fee = c, price * FEES[channel] / 1.1
        ship = (a['ship'] + a['mailer']) / 1.1
    else:
        # simplified taxpayers cannot reclaim input VAT, so it is a cost; above W48M a year they pay
        # about 1.5% of sales (retail value-added rate 15% x 10%), less 0.5% of purchases including VAT
        making, fee = c * 1.1, price * FEES[channel]
        ship = a['ship'] + a['mailer']
        vat = 0 if a['vat'] == 'none' else price * 0.015 - 0.005 * making
    defects = a['defect_rate'] * (making + a['return_ship'])
    acq = 0
    if content:
        acq = (1 - a['paid_share']) * a['content'] + a['paid_share'] * a['cac_paid']
    left = price - vat - fee - making - ship - defects - acq
    return dict(kind=kind, channel=channel, price=round(price), vat=round(vat), fee=round(fee),
                making=round(making), ship=round(ship), defects=round(defects), content=round(acq),
                left=round(left))


def blended(a, channel, content=True):
    """An average order, mixing singles and pairs at the pair share."""
    s, p = unit(a, 'single', channel, content), unit(a, 'pair', channel, content)
    w = a['pair_share']
    return dict(left=(1 - w) * s['left'] + w * p['left'],
                price=(1 - w) * s['price'] + w * p['price'],
                making=(1 - w) * s['making'] + w * p['making'],
                lockets=(1 - w) * 1 + w * 2)


# One-time costs before the first order, KRW including VAT where a small seller pays it.
# (item, cost, month it is paid in the default plan, counted from discharge in early April 2027)
LAUNCH = [
    ('Reference samples from China, by express', 450000, '2027-04'),
    ('CAD model and 3D-printed fit checks', 200000, '2027-04'),
    ('Trademark, classes 14 and 35, filed yourself', 546000, '2027-04'),
    ('Registration fees and local tax', 50000, '2027-04'),
    ('Custom samples from two suppliers', 300000, '2027-05'),
    ('Lab tests for lead, cadmium and nickel', 500000, '2027-05'),
    ('Box proof and foil die', 150000, '2027-05'),
    ('Design registration, filed yourself', 150000, '2027-05'),
    ('Twelve pieces made ahead of the batch: 10 for creators, 2 to film, shipped', 630000, '2027-06'),
    ('Photography and props', 200000, '2027-06'),
    ('Tools for six months', 270000, 'monthly'),
]
CONTINGENCY = 0.15


def launch_total():
    sub = sum(v for _, v, _ in LAUNCH)
    return sub, round(sub * CONTINGENCY), round(sub * (1 + CONTINGENCY))


if __name__ == '__main__':
    print('one locket', round(locket()), '| single boxed', round(cogs('single')), '| pair boxed', round(cogs('pair')))
    for vat in ['none', 'simplified', 'general']:
        a = dict(BASE, vat=vat)
        for ch in FEES:
            s, p = unit(a, 'single', ch), unit(a, 'pair', ch)
            print(f'{vat:10} {ch:10} single {s["left"]:>7,} pair {p["left"]:>7,}')
    print('launch', launch_total())
