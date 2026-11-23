"""
Cycle tick worker (P09 & P11).
Executes cutoff for open carts past cutoff day (25th 00:00 IST),
creating consolidated bulk orders for assigned retailers.
Run via:
    python -m app.workers.cycle_tick
"""

from app.core.clock import now_business
from app.modules.cart.cutoff import run_cycle_tick


def main():
    print(f"[CYCLE TICK] Running at {now_business().isoformat()}...")
    orders = run_cycle_tick()
    if orders:
        print(f"[CYCLE TICK] Cutoff executed. Created {len(orders)} community order(s):")
        for ord_row in orders:
            order_no = ord_row["order_no"]
            comm_id = ord_row["community_id"]
            print(f"  - Order {order_no} for community {comm_id}")
    else:
        print("[CYCLE TICK] No carts ready for cutoff.")


if __name__ == "__main__":
    main()
