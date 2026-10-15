# Keepsake economics model

The numbers in the Economics tab of [the master plan](../celestual-master-plan.md) come from these two files.

- `model.py`: what one locket costs, what one order leaves on each channel and VAT status, and the launch budget.
- `analysis.py`: break-even, the three first-year cases, the sensitivity of the middle case, and monthly cash. It writes `econ.json`.

Run it with `python3 analysis.py` from this folder. Most costs are estimates from the sourcing research in [../research](../research/), and no supplier has quoted yet. When quotes arrive, change `PARTS`, `PACK_SINGLE`, `PACK_PAIR` or `LAUNCH` in `model.py` and run it again.

The timeline it assumes: discharge in early April 2027, the Wadiz presale from 14 June to 11 July 2027, the payout in late July, and the shop selling from October 2027.
