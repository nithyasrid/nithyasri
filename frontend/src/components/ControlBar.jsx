import React from 'react'

export default function ControlBar({ running, onStart, onStop, onSeed, onReset, busy }) {
  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <span style={{
          ...styles.dot,
          background: running ? 'var(--safe)' : 'var(--text-dim)',
          boxShadow: running ? '0 0 0 4px var(--safe-dim)' : 'none',
        }} className={running ? 'pulse-dot' : ''} />
        <div>
          <div style={styles.title}>Fraud Detection Pipeline</div>
          <div style={styles.subtitle}>
            {running ? 'Stream active — scoring transactions in real time' : 'Stream paused'}
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <button
          style={{ ...styles.btn, ...(running ? styles.btnDanger : styles.btnPrimary) }}
          onClick={running ? onStop : () => onStart(1.2)}
          disabled={busy}
        >
          {running ? 'Stop stream' : 'Start stream'}
        </button>
        <button style={styles.btn} onClick={() => onSeed(40)} disabled={busy}>
          Seed 40 transactions
        </button>
        <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onReset} disabled={busy}>
          Reset data
        </button>
      </div>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 28px', borderBottom: '1px solid var(--border)',
    background: 'var(--panel)', flexWrap: 'wrap', gap: 16,
  },
  left: { display: 'flex', alignItems: 'center', gap: 14 },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  title: { fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' },
  subtitle: { fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--mono)' },
  right: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  btn: {
    padding: '9px 16px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--panel-raised)', color: 'var(--text)', fontSize: 13, fontWeight: 600,
  },
  btnPrimary: { background: 'var(--safe)', color: '#06201c', border: '1px solid var(--safe)' },
  btnDanger: { background: 'var(--alert)', color: '#2a0a0a', border: '1px solid var(--alert)' },
  btnGhost: { background: 'transparent', color: 'var(--text-muted)' },
}
