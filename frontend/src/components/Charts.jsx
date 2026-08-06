import React, { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts'

const RULE_LABELS = {
  amount_spike: 'Amount spike',
  high_velocity: 'High velocity',
  foreign_high_amount: 'Foreign + high amt',
  odd_hour_high_amount: 'Odd hour + high amt',
}

export default function Charts({ transactions }) {
  const scoreSeries = useMemo(() => {
    return transactions.slice(0, 60).reverse().map((t, i) => ({
      idx: i,
      score: t.fraud_score,
      flagged: t.is_flagged,
    }))
  }, [transactions])

  const reasonCounts = useMemo(() => {
    const counts = {}
    for (const t of transactions) {
      if (!t.rule_flags) continue
      for (const flag of t.rule_flags.split(',').filter(Boolean)) {
        counts[flag] = (counts[flag] || 0) + 1
      }
    }
    return Object.entries(counts).map(([key, count]) => ({
      name: RULE_LABELS[key] || key,
      count,
    }))
  }, [transactions])

  return (
    <div style={styles.row}>
      <div style={styles.panel}>
        <div style={styles.title}>Fraud score — last 60 transactions</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={scoreSeries} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#232a3a" />
            <XAxis dataKey="idx" tick={{ fill: '#7c8699', fontSize: 11 }} axisLine={{ stroke: '#232a3a' }} />
            <YAxis domain={[0, 1]} tick={{ fill: '#7c8699', fontSize: 11 }} axisLine={{ stroke: '#232a3a' }} />
            <Tooltip
              contentStyle={{ background: '#171c27', border: '1px solid #232a3a', borderRadius: 6, fontSize: 12 }}
              labelFormatter={() => ''}
              formatter={(v) => [v, 'fraud score']}
            />
            <Line type="monotone" dataKey="score" stroke="#2dd4bf" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.panel}>
        <div style={styles.title}>Triggered rule breakdown</div>
        {reasonCounts.length === 0 ? (
          <div style={styles.empty}>No rules triggered yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={reasonCounts} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232a3a" />
              <XAxis dataKey="name" tick={{ fill: '#7c8699', fontSize: 10.5 }} axisLine={{ stroke: '#232a3a' }} />
              <YAxis allowDecimals={false} tick={{ fill: '#7c8699', fontSize: 11 }} axisLine={{ stroke: '#232a3a' }} />
              <Tooltip contentStyle={{ background: '#171c27', border: '1px solid #232a3a', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {reasonCounts.map((_, i) => (
                  <Cell key={i} fill={['#fb5d5d', '#fbbf24', '#2dd4bf', '#8b8ff5'][i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

const styles = {
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '14px 28px', },
  panel: { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' },
  title: { fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  empty: { color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--mono)', padding: '60px 0', textAlign: 'center' },
}
