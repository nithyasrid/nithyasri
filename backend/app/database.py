"""
database.py
------------
Sets up the SQLite database and the SQLAlchemy ORM model for storing
transactions. SQLite is used instead of Postgres/BigQuery to keep the
project self-contained and runnable with zero external services - but
the code is written with SQLAlchemy so swapping in Postgres later is
a one-line change (just update DATABASE_URL).
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime

DATABASE_URL = "sqlite:///./fraud_pipeline.db"

# check_same_thread=False is needed because FastAPI + the background
# simulator thread will both touch the same SQLite connection pool.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Transaction(Base):
    """One row = one financial transaction, enriched with fraud scoring output."""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, unique=True, index=True)
    user_id = Column(String, index=True)
    amount = Column(Float)
    merchant_category = Column(String)
    location = Column(String)
    home_location = Column(String)
    is_foreign = Column(Boolean)
    hour_of_day = Column(Integer)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # feature engineering outputs
    transactions_last_1hr = Column(Integer)
    avg_amount_last_30days = Column(Float)
    amount_deviation = Column(Float)

    # fraud detection outputs
    ml_anomaly_score = Column(Float)      # raw isolation forest score
    rule_flags = Column(String)           # comma-separated triggered rule names
    fraud_score = Column(Float)           # combined 0-1 score
    is_flagged = Column(Boolean, index=True)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
