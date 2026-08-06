import React from 'react'

// The signature visual for this dashboard: a seismograph-style strip
// where every incoming transaction becomes one bar. Bar height maps
// to fraud_score, color maps to the decision. Reading left-to-right
// like a heart-rate monitor makes bursts of fraud immediately visible
// as a spike cluster, which is exactly the pattern a real SOC-style
// fraud dashboard wants to surface at a glance.
export default function PulseStrip({ transactions }) {
  const recent = transactions.slice(0, 80).reverse()

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.title}>Live transaction pulse</span>
        <span style={styles.legend}>
          <LegendDot color="var(--safe)" label="normal" />
          <LegendDot color="var(--warn)" label="watch" />
          <LegendDot color="var(--alert)" label="flagged" />
        </span>
      </div>
      <div style={styles.strip}>
        {recent.length === 0 && (
          <div style={styles.empty}>No transactions yet — start the stream or seed some data.</div>
        )}
        {recent.map((t) => {
          const score = t.fraud_score
          const color = t.is_flagged ? 'var(--alert)' : score > 0.25 ? 'var(--warn)' : 'var(--safe)'
          const height = Math.max(6, Math.round(score * 54))
          return (
            <div
              key={t.transaction_id}
              title={`${t.transaction_id} · ₹${t.amount} · score ${score}`}
              style={{
                ...styles.bar,
                height,
                background: color,
                boxShadow: t.is_flagged ? '0 0 8px var(--alert)' : 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 14 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
    </span>
  )
}

const styles = {
  wrap: {
    margin: '4px 28px 0', background: 'var(--panel)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '16px 18px 14px',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  legend: { display: 'flex' },
  strip: {
    display: 'flex', alignItems: 'flex-end', gap: 3, height: 64,
    overflow: 'hidden', borderBottom: '1px solid var(--border)', paddingBottom: 2,
  },
  bar: { width: 4, borderRadius: '2px 2px 0 0', flexShrink: 0, transition: 'height 0.2s ease' },
  empty: { color: 'var(--text-dim)', fontSize: 13, alignSelf: 'center', fontFamily: 'var(--mono)' },
}
