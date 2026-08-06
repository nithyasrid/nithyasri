import React from 'react'

function Card({ label, value, accent, sub }) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={{ ...styles.value, color: accent || 'var(--text)' }} className="mono">{value}</div>
      {sub && <div style={styles.sub}>{sub}</div>}
    </div>
  )
}

export default function StatsCards({ stats }) {
  if (!stats) return null
  return (
    <div style={styles.grid}>
      <Card label="Total transactions" value={stats.total_transactions.toLocaleString()} />
      <Card
        label="Flagged as fraud"
        value={stats.flagged_transactions.toLocaleString()}
        accent="var(--alert)"
      />
      <Card
        label="Fraud rate"
        value={`${stats.fraud_rate_pct}%`}
        accent={stats.fraud_rate_pct > 8 ? 'var(--alert)' : 'var(--warn)'}
      />
      <Card
        label="Avg amount (flagged vs normal)"
        value={`₹${stats.avg_amount_flagged.toLocaleString()}`}
        sub={`vs ₹${stats.avg_amount_all.toLocaleString()} overall`}
        accent="var(--warn)"
      />
    </div>
  )
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14, padding: '20px 28px 4px',
  },
  card: {
    background: 'var(--panel)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '16px 18px',
  },
  label: { fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  value: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' },
  sub: { fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--mono)' },
}
