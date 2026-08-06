"""
schemas.py
----------
Pydantic models used to validate/serialize API responses.
Kept separate from the SQLAlchemy models in database.py so the DB
layer and the API contract can evolve independently.
"""

from pydantic import BaseModel
import datetime


class TransactionOut(BaseModel):
    id: int
    transaction_id: str
    user_id: str
    amount: float
    merchant_category: str
    location: str
    home_location: str
    is_foreign: bool
    hour_of_day: int
    timestamp: datetime.datetime
    transactions_last_1hr: int
    avg_amount_last_30days: float
    amount_deviation: float
    ml_anomaly_score: float
    rule_flags: str
    fraud_score: float
    is_flagged: bool

    class Config:
        from_attributes = True


class StatsOut(BaseModel):
    total_transactions: int
    flagged_transactions: int
    fraud_rate_pct: float
    avg_amount_all: float
    avg_amount_flagged: float
    simulation_running: bool
