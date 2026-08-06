import React from 'react'

export default function TransactionTable({ transactions, flaggedOnly, onToggleFlaggedOnly }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.title}>Transaction feed</div>
        <label style={styles.toggle}>
          <input type="checkbox" checked={flaggedOnly} onChange={onToggleFlaggedOnly} />
          Flagged only
        </label>
      </div>

      <div style={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              {['Time', 'User', 'Amount', 'Location', 'Rules triggered', 'ML score', 'Fraud score', 'Status'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr><td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-dim)' }}>
                No transactions to show yet.
              </td></tr>
            )}
            {transactions.map(t => (
              <tr key={t.transaction_id} style={t.is_flagged ? styles.rowFlagged : undefined}>
                <td style={styles.td} className="mono">{new Date(t.timestamp + 'Z').toLocaleTimeString()}</td>
                <td style={styles.td} className="mono">{t.user_id}</td>
                <td style={styles.td} className="mono">₹{t.amount.toLocaleString()}</td>
                <td style={styles.td}>
                  {t.location}{t.is_foreign && <span style={styles.foreignTag}>foreign</span>}
                </td>
                <td style={styles.td}>
                  {t.rule_flags
                    ? t.rule_flags.split(',').map(f => <span key={f} style={styles.ruleTag}>{f}</span>)
                    : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                </td>
                <td style={styles.td} className="mono">{t.ml_anomaly_score.toFixed(2)}</td>
                <td style={{ ...styles.td, fontWeight: 700 }} className="mono">{t.fraud_score.toFixed(2)}</td>
                <td style={styles.td}>
                  <span style={t.is_flagged ? styles.badgeFlagged : styles.badgeOk}>
                    {t.is_flagged ? 'Flagged' : 'Normal'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  wrap: { margin: '14px 28px 28px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' },
  title: { fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  toggle: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)' },
  tableScroll: { maxHeight: 420, overflowY: 'auto' },
  th: {
    textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em',
    color: 'var(--text-dim)', padding: '10px 14px', borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, background: 'var(--panel)',
  },
  td: { padding: '9px 14px', fontSize: 12.5, borderBottom: '1px solid var(--border)', color: 'var(--text)' },
  rowFlagged: { background: 'rgba(251, 93, 93, 0.06)' },
  badgeFlagged: {
    background: 'var(--alert-dim)', color: 'var(--alert)', fontSize: 11, fontWeight: 700,
    padding: '3px 8px', borderRadius: 4,
  },
  badgeOk: {
    background: 'var(--safe-dim)', color: 'var(--safe)', fontSize: 11, fontWeight: 700,
    padding: '3px 8px', borderRadius: 4,
  },
  ruleTag: {
    display: 'inline-block', fontSize: 10.5, background: 'var(--panel-raised)', color: 'var(--text-muted)',
    border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 4, marginRight: 4, marginBottom: 2,
    fontFamily: 'var(--mono)',
  },
  foreignTag: {
    fontSize: 10, color: 'var(--warn)', marginLeft: 6, border: '1px solid var(--warn)',
    padding: '1px 5px', borderRadius: 4,
  },
}
