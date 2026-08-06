import React, { useEffect, useState, useCallback, useRef } from 'react'
import { api } from './api'
import ControlBar from './components/ControlBar'
import StatsCards from './components/StatsCards'
import PulseStrip from './components/PulseStrip'
import Charts from './components/Charts'
import TransactionTable from './components/TransactionTable'

const POLL_MS = 2000

export default function App() {
  const [stats, setStats] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const refresh = useCallback(async (flaggedOnlyOverride) => {
    try {
      const [s, t] = await Promise.all([
        api.getStats(),
        api.getTransactions(150, flaggedOnlyOverride ?? flaggedOnly),
      ])
      setStats(s)
      setTransactions(t)
      setError(null)
    } catch (e) {
      setError('Could not reach the backend at http://localhost:8000 — is it running?')
    }
  }, [flaggedOnly])

  useEffect(() => {
    refresh()
    pollRef.current = setInterval(refresh, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [refresh])

  const handleStart = async (interval) => {
    setBusy(true)
    try { await api.startSimulation(interval); await refresh() } finally { setBusy(false) }
  }
  const handleStop = async () => {
    setBusy(true)
    try { await api.stopSimulation(); await refresh() } finally { setBusy(false) }
  }
  const handleSeed = async (n) => {
    setBusy(true)
    try { await api.seed(n); await refresh() } finally { setBusy(false) }
  }
  const handleReset = async () => {
    setBusy(true)
    try { await api.reset(); await refresh() } finally { setBusy(false) }
  }
  const handleToggleFlaggedOnly = () => {
    setFlaggedOnly(prev => {
      refresh(!prev)
      return !prev
    })
  }

  return (
    <div>
      <style>{`
        .pulse-dot { animation: pulseGlow 1.6s ease-in-out infinite; }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      <ControlBar
        running={stats?.simulation_running ?? false}
        onStart={handleStart}
        onStop={handleStop}
        onSeed={handleSeed}
        onReset={handleReset}
        busy={busy}
      />

      {error && (
        <div style={{
          margin: '16px 28px 0', padding: '12px 16px', borderRadius: 8,
          background: 'rgba(251,93,93,0.08)', border: '1px solid var(--alert)',
          color: 'var(--alert)', fontSize: 13, fontFamily: 'var(--mono)',
        }}>
          {error}
        </div>
      )}

      <StatsCards stats={stats} />
      <PulseStrip transactions={transactions} />
      <Charts transactions={transactions} />
      <TransactionTable
        transactions={transactions}
        flaggedOnly={flaggedOnly}
        onToggleFlaggedOnly={handleToggleFlaggedOnly}
      />

      <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 11.5, padding: '4px 0 28px', fontFamily: 'var(--mono)' }}>
        Simulated data for demo purposes · refreshes every {POLL_MS / 1000}s
      </div>
    </div>
  )
}
