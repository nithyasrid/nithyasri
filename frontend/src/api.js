import axios from 'axios'

// Points at the FastAPI backend. Change this if you run the backend
// on a different host/port.
const API_BASE = 'http://localhost:8000'

const client = axios.create({ baseURL: API_BASE })

export const api = {
  getStats: () => client.get('/stats').then(r => r.data),
  getTransactions: (limit = 100, flaggedOnly = false) =>
    client.get('/transactions', { params: { limit, flagged_only: flaggedOnly } }).then(r => r.data),
  startSimulation: (intervalSeconds = 1.5) =>
    client.post('/simulate/start', null, { params: { interval_seconds: intervalSeconds } }).then(r => r.data),
  stopSimulation: () => client.post('/simulate/stop').then(r => r.data),
  seed: (n = 50) => client.post('/simulate/seed', null, { params: { n } }).then(r => r.data),
  reset: () => client.delete('/reset').then(r => r.data),
}
