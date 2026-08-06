"""
fraud_detector.py
------------------
Core fraud scoring logic. Combines two layers, which is a common
real-world pattern (and gives you two things to talk through in an
interview instead of one black box):

1. RULE-BASED CHECKS
   Fast, explainable, catch known fraud patterns immediately with
   zero training data required. Examples: sudden spend spike vs a
   user's own history, too many transactions in a short window,
   high-value transaction from a foreign/unfamiliar location, odd
   hour + high amount.

2. ML ANOMALY DETECTION (Isolation Forest)
   Unsupervised model that isolates points that are "few and
   different" in feature space. Catches fraud patterns that don't
   match any hand-written rule. Trained on a rolling window of
   recent transactions so it adapts over time.

The two layers are combined into a single fraud_score in [0, 1] and
a boolean is_flagged decision.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

# ---- Rule thresholds (tunable) ------------------------------------------------
AMOUNT_SPIKE_MULTIPLIER = 4.0      # amount > 4x user's own 30-day average
VELOCITY_THRESHOLD = 3             # more than 3 transactions in the last hour
FOREIGN_HIGH_AMOUNT = 8000.0       # rupees; foreign txn above this is suspicious
ODD_HOUR_RANGE = (1, 5)            # 1am - 5am
ODD_HOUR_AMOUNT = 5000.0

# Minimum number of historical transactions before we trust the ML model.
MIN_TRAINING_ROWS = 30


def apply_rules(txn: dict) -> list[str]:
    """Run all rule checks against a single transaction dict. Returns
    the list of rule names that fired (empty list = no rules triggered)."""
    flags = []

    if txn["avg_amount_last_30days"] > 0 and \
            txn["amount"] > AMOUNT_SPIKE_MULTIPLIER * txn["avg_amount_last_30days"]:
        flags.append("amount_spike")

    if txn["transactions_last_1hr"] > VELOCITY_THRESHOLD:
        flags.append("high_velocity")

    if txn["is_foreign"] and txn["amount"] > FOREIGN_HIGH_AMOUNT:
        flags.append("foreign_high_amount")

    hour = txn["hour_of_day"]
    if ODD_HOUR_RANGE[0] <= hour <= ODD_HOUR_RANGE[1] and txn["amount"] > ODD_HOUR_AMOUNT:
        flags.append("odd_hour_high_amount")

    return flags


class FraudScorer:
    """
    Wraps an IsolationForest and retrains it periodically on recent
    history, so the "model" adapts to the current data distribution
    rather than being trained once and frozen (closer to how a real
    streaming fraud pipeline would behave with periodic batch retrains).
    """

    FEATURE_COLUMNS = [
        "amount",
        "hour_of_day",
        "transactions_last_1hr",
        "amount_deviation",
    ]

    def __init__(self, contamination: float = 0.03):
        self.contamination = contamination
        self.model: IsolationForest | None = None
        self.trained_rows = 0

    def maybe_retrain(self, history_df: pd.DataFrame, retrain_every: int = 25):
        """Retrain if we have enough data and haven't retrained recently."""
        n = len(history_df)
        if n < MIN_TRAINING_ROWS:
            return
        if self.model is not None and (n - self.trained_rows) < retrain_every:
            return

        X = history_df[self.FEATURE_COLUMNS].values
        self.model = IsolationForest(
            n_estimators=150,
            contamination=self.contamination,
            random_state=42,
        )
        self.model.fit(X)
        self.trained_rows = n

    def score(self, txn: dict) -> float:
        """Return an anomaly score in [0, 1], higher = more anomalous.
        If the model isn't trained yet, return a neutral low score."""
        if self.model is None:
            return 0.05

        X = np.array([[txn[c] for c in self.FEATURE_COLUMNS]])
        # decision_function: higher = more normal, lower/negative = more anomalous.
        raw = self.model.decision_function(X)[0]
        # squash into [0, 1] where 1 = highly anomalous
        anomaly = 1 / (1 + np.exp(raw * 4))  # sigmoid squashing, tuned by *4
        return float(np.clip(anomaly, 0.0, 1.0))


def combine_score(ml_score: float, rule_flags: list[str]) -> tuple[float, bool]:
    """
    Combine the ML anomaly score with rule flags into one fraud_score
    and a final is_flagged decision.

    Weighting: each triggered rule adds a fixed bump, ML contributes
    the base score. This is intentionally simple/explainable rather
    than a learned ensemble - easy to defend in an interview.
    """
    rule_bump = min(len(rule_flags) * 0.25, 0.75)
    fraud_score = min(ml_score * 0.6 + rule_bump, 1.0)
    is_flagged = fraud_score >= 0.5 or len(rule_flags) > 0
    return round(fraud_score, 4), is_flagged
