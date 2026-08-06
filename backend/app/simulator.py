"""
simulator.py
------------
Simulates a real-time stream of financial transactions. In a
production pipeline this role would be played by Kafka producers
reading from a payments system; here a background Python thread
generates a new transaction every N seconds and pushes it through
the same feature-engineering + scoring path a real streaming
consumer would use.

Design choices worth explaining in an interview:
- A small pool of synthetic "users" each have a home location and a
  spending baseline, so per-user historical features (avg spend,
  velocity) are meaningful instead of random noise.
- Fraud is injected at a controllable rate so the dashboard always
  has something interesting to show, and so you can demo the
  detector's precision/recall behavior on demand.
- Feature engineering (transactions_last_1hr, avg_amount_last_30days,
  amount_deviation) is computed from the same SQLite table the API
  reads from - i.e. features are derived from state, not simulated
  directly, which mirrors how a real streaming job would maintain
  rolling aggregates.
"""

import random
import string
import threading
import time
import datetime
import pandas as pd
from sqlalchemy import func

from .database import SessionLocal, Transaction
from .fraud_detector import FraudScorer, apply_rules, combine_score

MERCHANT_CATEGORIES = ["groceries", "electronics", "travel", "dining", "fuel", "utilities", "entertainment"]
CITIES = ["Coimbatore", "Chennai", "Bangalore", "Mumbai", "Delhi", "Hyderabad"]
FOREIGN_CITIES = ["Dubai", "Singapore", "London", "New York"]

random.seed(42)


class UserProfile:
    """A synthetic customer with a stable spending baseline."""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.home_location = random.choice(CITIES)
        self.baseline_amount = random.uniform(200, 3000)  # typical spend in INR


class TransactionSimulator:
    def __init__(self, n_users: int = 40):
        self.users = [UserProfile(f"user_{i:03d}") for i in range(n_users)]
        self.scorer = FraudScorer()
        self._running = False
        self._thread: threading.Thread | None = None
        self.fraud_injection_rate = 0.12  # ~12% of simulated txns are deliberately fraud-like

    # ---------------------------------------------------------------- helpers
    @staticmethod
    def _new_id() -> str:
        return "txn_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=10))

    def _generate_raw_transaction(self) -> dict:
        user = random.choice(self.users)
        inject_fraud = random.random() < self.fraud_injection_rate

        if inject_fraud:
            # Simulate a suspicious pattern: big amount spike, possibly foreign, possibly odd hour
            amount = user.baseline_amount * random.uniform(5, 15)
            location = random.choice(FOREIGN_CITIES + CITIES)
            hour = random.choice(list(range(1, 5)) + list(range(0, 24)))
        else:
            amount = max(50, random.gauss(user.baseline_amount, user.baseline_amount * 0.25))
            location = user.home_location if random.random() > 0.05 else random.choice(CITIES)
            hour = random.choice(range(6, 23))

        return {
            "transaction_id": self._new_id(),
            "user_id": user.user_id,
            "amount": round(amount, 2),
            "merchant_category": random.choice(MERCHANT_CATEGORIES),
            "location": location,
            "home_location": user.home_location,
            "is_foreign": location in FOREIGN_CITIES,
            "hour_of_day": hour,
            "timestamp": datetime.datetime.utcnow(),
        }

    # ------------------------------------------------------------- features
    def _compute_features(self, db, txn: dict) -> dict:
        """Compute rolling features from DB state, mimicking a streaming
        job maintaining per-user aggregates."""
        one_hour_ago = txn["timestamp"] - datetime.timedelta(hours=1)
        thirty_days_ago = txn["timestamp"] - datetime.timedelta(days=30)

        velocity = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == txn["user_id"],
            Transaction.timestamp >= one_hour_ago,
        ).scalar() or 0

        avg_amount = db.query(func.avg(Transaction.amount)).filter(
            Transaction.user_id == txn["user_id"],
            Transaction.timestamp >= thirty_days_ago,
        ).scalar() or 0.0

        txn["transactions_last_1hr"] = int(velocity)
        txn["avg_amount_last_30days"] = round(float(avg_amount), 2)
        txn["amount_deviation"] = round(txn["amount"] - txn["avg_amount_last_30days"], 2)
        return txn

    # ---------------------------------------------------------------- score
    def _score_and_store(self, db, txn: dict):
        history = pd.read_sql(
            db.query(Transaction).statement, db.bind
        )
        if not history.empty:
            self.scorer.maybe_retrain(history)

        ml_score = self.scorer.score(txn)
        rule_flags = apply_rules(txn)
        fraud_score, is_flagged = combine_score(ml_score, rule_flags)

        record = Transaction(
            **{k: v for k, v in txn.items() if k not in ("timestamp",)},
            timestamp=txn["timestamp"],
            ml_anomaly_score=round(ml_score, 4),
            rule_flags=",".join(rule_flags),
            fraud_score=fraud_score,
            is_flagged=is_flagged,
        )
        db.add(record)
        db.commit()

    # -------------------------------------------------------------- control
    def generate_one(self):
        db = SessionLocal()
        try:
            txn = self._generate_raw_transaction()
            txn = self._compute_features(db, txn)
            self._score_and_store(db, txn)
        finally:
            db.close()

    def _run_loop(self, interval_seconds: float):
        while self._running:
            self.generate_one()
            time.sleep(interval_seconds)

    def start(self, interval_seconds: float = 1.5):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, args=(interval_seconds,), daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running


simulator = TransactionSimulator()
