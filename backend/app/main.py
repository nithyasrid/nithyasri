"""
main.py
-------
FastAPI application exposing the fraud detection pipeline as a REST API.

Endpoints:
  POST /simulate/start        -> start generating transactions in the background
  POST /simulate/stop         -> stop the background generator
  POST /simulate/seed?n=50    -> synchronously generate N transactions (useful for demo/tests)
  GET  /transactions          -> list recent transactions (optionally flagged only)
  GET  /transactions/{id}     -> single transaction detail
  GET  /stats                 -> summary statistics for the dashboard
  DELETE /reset                -> wipe all data and start fresh
"""

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import init_db, get_db, Transaction, engine, Base
from .schemas import TransactionOut, StatsOut
from .simulator import simulator

app = FastAPI(title="Real-Time Fraud Detection Pipeline (Simplified)")

# Allow the React dev server (default Vite port 5173, CRA port 3000) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {"status": "ok", "message": "Fraud detection pipeline API is running."}


@app.post("/simulate/start")
def start_simulation(interval_seconds: float = 1.5):
    simulator.start(interval_seconds=interval_seconds)
    return {"running": True, "interval_seconds": interval_seconds}


@app.post("/simulate/stop")
def stop_simulation():
    simulator.stop()
    return {"running": False}


@app.post("/simulate/seed")
def seed_transactions(n: int = 50):
    """Synchronously generate N transactions right now - handy for a first
    demo so the dashboard isn't empty while waiting on the background loop."""
    for _ in range(n):
        simulator.generate_one()
    return {"generated": n}


@app.get("/transactions", response_model=list[TransactionOut])
def list_transactions(
    limit: int = Query(100, le=1000),
    flagged_only: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).order_by(Transaction.timestamp.desc())
    if flagged_only:
        q = q.filter(Transaction.is_flagged == True)  # noqa: E712
    return q.limit(limit).all()


@app.get("/transactions/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


@app.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(Transaction.id)).scalar() or 0
    flagged = db.query(func.count(Transaction.id)).filter(Transaction.is_flagged == True).scalar() or 0  # noqa: E712
    avg_all = db.query(func.avg(Transaction.amount)).scalar() or 0.0
    avg_flagged = db.query(func.avg(Transaction.amount)).filter(
        Transaction.is_flagged == True  # noqa: E712
    ).scalar() or 0.0

    return StatsOut(
        total_transactions=total,
        flagged_transactions=flagged,
        fraud_rate_pct=round((flagged / total * 100), 2) if total else 0.0,
        avg_amount_all=round(float(avg_all), 2),
        avg_amount_flagged=round(float(avg_flagged), 2),
        simulation_running=simulator.is_running,
    )


@app.delete("/reset")
def reset_data():
    simulator.stop()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"status": "reset complete"}
