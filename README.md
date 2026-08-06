# Real-Time Fraud Detection Pipeline (Simplified)

A working, self-contained fraud detection pipeline: a Python/FastAPI backend that
simulates a stream of financial transactions, scores each one for fraud using a
combination of **rule-based checks** and an **Isolation Forest anomaly detection
model**, stores everything in SQLite, and exposes it through a REST API. A
React dashboard visualizes the live stream, flagged transactions, and score
trends.

This is intentionally built with a **simple, honest stack** you can fully explain
in an interview — no Kafka, Spark, or BigQuery. It demonstrates the same core
data engineering ideas (ingestion → feature engineering → scoring → storage →
serving) without infrastructure you haven't actually operated.

---

## Why this stack (and not Kafka/Spark/BigQuery)

The original inspiration for this project was a "streaming fraud pipeline" using
Kafka, Spark Streaming, BigQuery, and Airflow. That stack is real and valuable,
but claiming it on a resume for an internship invites deep technical-panel
questions (partitioning strategy, consumer groups, watermarking, DAG scheduling)
that are hard to answer convincingly without hands-on experience.

This version keeps the **same architectural shape** — a producer generating
events, a consumer computing features and scoring them, a store, and a serving
layer — but implements each piece with tools you can defend line-by-line:

| Role in a "real" pipeline | This project's implementation |
|---|---|
| Kafka producer (transaction stream) | Python background thread generating synthetic transactions (`simulator.py`) |
| Kafka consumer / Spark Streaming job | Same thread computing rolling features + running the fraud scorer inline |
| Feature store / rolling aggregates | SQL queries against SQLite computing per-user 1-hour velocity and 30-day average spend |
| Model scoring | `scikit-learn` `IsolationForest`, retrained periodically on recent history |
| BigQuery (analytics store) | SQLite via SQLAlchemy (swap `DATABASE_URL` for Postgres/BigQuery later — the ORM code doesn't change) |
| Airflow (orchestration) | FastAPI endpoints (`/simulate/start`, `/simulate/stop`) trigger and control the background job |
| Dashboard | React + Recharts, polling the API every 2 seconds |

If asked "how would you make this production-grade," the honest answer is:
swap the in-process generator for a real Kafka topic, replace the polling
background thread with a Spark Structured Streaming or Flink consumer group,
move the feature aggregates into a proper feature store (or windowed
Spark aggregations), and point SQLAlchemy at BigQuery/Postgres instead of
SQLite. The scoring logic (rules + Isolation Forest) doesn't need to change.

---

## Architecture

```
┌─────────────────┐      ┌──────────────────────────────────────────────┐
│  simulator.py    │      │  fraud_detector.py                          │
│  (background     │─────▶│  1. apply_rules()      — explainable checks │
│   thread, mimics  │      │  2. FraudScorer         — Isolation Forest  │
│   a Kafka producer│      │  3. combine_score()    — fraud_score + flag │
│   + consumer)     │      └──────────────────────────────────────────────┘
└─────────┬────────┘                          │
          │ writes scored rows                │
          ▼                                   │
┌──────────────────┐                          │
│  SQLite            │◀─────────────────────────┘
│  (transactions      │
│   table)           │
└─────────┬─────────┘
          │ reads via SQLAlchemy
          ▼
┌──────────────────┐        HTTP (JSON)        ┌──────────────────┐
│  FastAPI            │ ─────────────────────────▶ │  React dashboard   │
│  (main.py)          │ ◀───────────────────────── │  (polls every 2s)  │
└──────────────────┘                            └──────────────────┘
```

### Fraud scoring logic

Every transaction is scored two ways:

1. **Rule-based checks** (`apply_rules` in `fraud_detector.py`) — fast,
   explainable, zero training data needed:
   - `amount_spike` — amount is 4x+ the user's own 30-day average
   - `high_velocity` — more than 3 transactions from the same user in the last hour
   - `foreign_high_amount` — high-value transaction from a foreign location
   - `odd_hour_high_amount` — large transaction between 1am–5am

2. **ML anomaly detection** (`FraudScorer` in `fraud_detector.py`) — an
   `IsolationForest` trained on `[amount, hour_of_day, transactions_last_1hr,
   amount_deviation]`, retrained every 25 new transactions once there's
   enough history. It catches patterns that don't match any hand-written rule.

The two are combined into a single `fraud_score` in `[0, 1]`
(`combine_score`), and a transaction is flagged if the score crosses 0.5 **or**
any rule fires — rules are treated as high-confidence overrides.

---

## Project structure

```
fraud-detection-pipeline/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + REST endpoints
│   │   ├── database.py        # SQLAlchemy models + SQLite setup
│   │   ├── schemas.py         # Pydantic response models
│   │   ├── fraud_detector.py  # Rule checks + Isolation Forest scoring
│   │   └── simulator.py       # Synthetic transaction generator (the "stream")
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Polling + layout
│   │   ├── api.js             # API client
│   │   └── components/
│   │       ├── ControlBar.jsx       # Start/stop stream, seed, reset
│   │       ├── StatsCards.jsx       # Summary stat cards
│   │       ├── PulseStrip.jsx       # Live seismograph-style transaction feed
│   │       ├── Charts.jsx           # Fraud score trend + rule breakdown
│   │       └── TransactionTable.jsx # Scrollable live transaction table
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Setup and running locally

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is now running at `http://localhost:8000`. Interactive docs (Swagger)
are auto-generated at `http://localhost:8000/docs`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The dashboard is now running at `http://localhost:5173`.

### 3. Try it out

1. Open `http://localhost:5173` in your browser.
2. Click **"Seed 40 transactions"** to instantly populate the dashboard.
3. Click **"Start stream"** to keep generating a new transaction every ~1.2
   seconds and watch the pulse strip, charts, and table update live.
4. Toggle **"Flagged only"** in the transaction table to see just the fraud
   alerts.
5. **"Reset data"** wipes the database and starts fresh.

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/simulate/start?interval_seconds=1.5` | Start the background transaction generator |
| `POST` | `/simulate/stop` | Stop the generator |
| `POST` | `/simulate/seed?n=50` | Synchronously generate N transactions right now |
| `GET` | `/transactions?limit=100&flagged_only=false` | List recent transactions |
| `GET` | `/transactions/{transaction_id}` | Get one transaction's full detail |
| `GET` | `/stats` | Summary stats (totals, fraud rate, average amounts) |
| `DELETE` | `/reset` | Wipe all data |

---

## Things to highlight in an interview

- **Two-layer scoring**: why combine explainable rules with an unsupervised
  model instead of relying on either alone (rules catch known patterns
  instantly with no training data; ML catches novel patterns rules miss).
- **Feature engineering from state, not from the raw event**: `transactions_last_1hr`
  and `avg_amount_last_30days` are computed by querying accumulated history at
  scoring time — this is the same idea as a streaming job maintaining rolling
  aggregates/windowed state, just implemented with a SQL query instead of a
  Flink/Spark windowed operator.
- **Periodic retraining**: the Isolation Forest retrains every 25 new rows
  instead of training once and freezing, so it adapts as the data
  distribution shifts — analogous to a scheduled batch retrain job.
- **Why SQLite, not Postgres/BigQuery**: kept the project runnable with zero
  external services; SQLAlchemy makes swapping the backing store a
  configuration change, not a rewrite.
- **What's simulated vs. real**: the transaction stream and fraud injection
  are synthetic (`simulator.py`), but the feature computation, scoring
  pipeline, storage layer, and API/dashboard are fully real and functional —
  be upfront about this distinction if asked.

---

## Known limitations (be upfront about these)

- Data is synthetic, not a real Kaggle/production dataset — fraud patterns
  are hand-designed to be detectable, so precision/recall numbers here aren't
  meaningful benchmarks.
- Single-process, single-machine — no real distributed processing, exactly-once
  semantics, or backpressure handling that Kafka/Spark would provide.
- SQLite is not suited for concurrent high-throughput writes — fine for a
  demo, not for production load.
