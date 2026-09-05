// src/lib/api.js
// Wrapper around the FastAPI backend (/api/*) calls

const BASE = typeof window !== 'undefined' ? `http://${window.location.hostname}:8000/api` : 'http://localhost:8000/api'

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error('Backend offline')
  return res.json()
}

export async function submitComplaint({ address, chain, category, officer }) {
  const res = await fetch(`${BASE}/complaint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      victim_reported_address: address,
      chain,
      complaint_category: category,
      reporting_officer: officer || undefined,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchReport(caseId) {
  const res = await fetch(`${BASE}/report/${caseId}`)
  if (!res.ok) throw new Error('Report not found')
  return res.json()
}

export async function fetchDashboardStats() {
  const res = await fetch(`${BASE}/dashboard/stats`)
  if (!res.ok) throw new Error('Stats unavailable')
  return res.json()
}

export async function fetchCase(caseId) {
  const res = await fetch(`${BASE}/case/${caseId}`)
  if (!res.ok) throw new Error('Case not found')
  return res.json()
}

export async function fetchCases() {
  const res = await fetch(`${BASE}/cases`)
  if (!res.ok) throw new Error('Cases unavailable')
  return res.json()
}

export async function fetchMLAnalysis(caseId) {
  const res = await fetch(`${BASE}/ml/${caseId}`)
  if (!res.ok) throw new Error('ML analysis not found')
  return res.json()
}

// ─── Real-Time Crypto & Blockchain APIs ──────────────────────────────────────

export async function fetchMarketPrices() {
  const res = await fetch(`${BASE}/crypto/market`)
  if (!res.ok) throw new Error('Market prices unavailable')
  return res.json()
}

export async function fetchGasPrices() {
  const res = await fetch(`${BASE}/crypto/gas`)
  if (!res.ok) throw new Error('Gas prices unavailable')
  return res.json()
}

export async function fetchBlockchainStatus() {
  const res = await fetch(`${BASE}/blockchain/status`)
  if (!res.ok) throw new Error('Blockchain status unavailable')
  return res.json()
}

export async function fetchAddressMetrics(chain, address) {
  const res = await fetch(`${BASE}/blockchain/address/${chain}/${encodeURIComponent(address)}`)
  if (!res.ok) throw new Error('Address metrics unavailable')
  return res.json()
}

export async function fetchLiveMempool(chain = 'bitcoin', count = 40) {
  const res = await fetch(`${BASE}/live/mempool?chain=${chain}&count=${count}`)
  if (!res.ok) throw new Error('Mempool data unavailable')
  return res.json()
}

export async function fetchLiveInteractions(limit = 40, category = 'all') {
  const res = await fetch(`${BASE}/live/interactions?limit=${limit}&category=${category}`)
  if (!res.ok) throw new Error('Interactions unavailable')
  return res.json()
}

/**
 * Connect to real-time WebSocket feed with automatic reconnection
 */
export function connectRealtimeWebSocket(onMessage, onStatusChange) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // In dev, backend runs on port 8000
  const host = window.location.port === '5173' 
    ? `${window.location.hostname}:8000` 
    : window.location.host
  const wsUrl = `${protocol}//${host}/api/ws/realtime`

  let ws = null
  let isClosed = false
  let reconnectTimer = null

  function connect() {
    if (isClosed) return
    try {
      ws = new WebSocket(wsUrl)
      if (onStatusChange) onStatusChange('connecting')

      ws.onopen = () => {
        if (onStatusChange) onStatusChange('connected')
      }

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data)
          if (onMessage) onMessage(data)
        } catch (err) {
          console.error('WS parse error:', err)
        }
      }

      ws.onerror = () => {
        if (onStatusChange) onStatusChange('error')
      }

      ws.onclose = () => {
        if (onStatusChange) onStatusChange('disconnected')
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, 3000)
        }
      }
    } catch (e) {
      if (onStatusChange) onStatusChange('error')
      if (!isClosed) {
        reconnectTimer = setTimeout(connect, 3000)
      }
    }
  }

  connect()

  return {
    close: () => {
      isClosed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) ws.close()
    },
    sendPing: () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('ping')
      }
    }
  }
}

// Demo/fallback mock data for when backend is offline
export const MOCK_CASE = {
  case_id: 'DEMO-2026-001',
  chain: 'ethereum',
  complaint_category: 'Investment scam',
  victim_reported_address: '0xDe0B295669a9FD93d5F28D9Ec85E40f4cb697BA',
  risk_assessment: {
    risk_score: 87,
    risk_band: 'CRITICAL',
    reasons: [
      'Mixer service interaction detected (Tornado Cash)',
      'Cross-chain bridge transaction to BSC',
      'High-velocity layering pattern (>10 hops/hr)',
      'Destination address is known darknet market deposit',
    ],
  },
  trace_result: {
    attribution: { exchange: 'Binance', type: 'Centralised Exchange' },
    data_source: 'simulated',
    traced_hops: 6,
    flags: { hops_to_exchange: 4, cross_chain_detected: true },
    graph: {
      nodes: [
        { id: '0xDe0B...BA', label: 'Victim', type: 'source' },
        { id: '0xMixer1', label: 'Tornado Cash', type: 'mixer' },
        { id: '0xLayer1', label: 'Layering #1', type: 'layering' },
        { id: '0xLayer2', label: 'Layering #2', type: 'layering' },
        { id: '0xBridge1', label: 'Wormhole Bridge', type: 'bridge' },
        { id: '0xExch1', label: 'Binance Deposit', type: 'exchange' },
      ],
      edges: [
        { from: '0xDe0B...BA', to: '0xMixer1', value: '12.5 ETH' },
        { from: '0xMixer1', to: '0xLayer1', value: '12.2 ETH' },
        { from: '0xLayer1', to: '0xLayer2', value: '11.9 ETH' },
        { from: '0xLayer2', to: '0xBridge1', value: '11.5 ETH' },
        { from: '0xBridge1', to: '0xExch1', value: '11.5 ETH (BSC)' },
      ],
    },
  },
  ml_analysis: {
    top_fraud_typology: 'Investment Scam / Pig Butchering',
    typology_confidence: 91.4,
    anomaly_score: 88.2,
    anomaly_band: 'HIGHLY ANOMALOUS',
    patterns_detected: [
      { pattern_name: 'Peel Chain', risk_boost: 15 },
      { pattern_name: 'Mixer-Exit', risk_boost: 20 },
      { pattern_name: 'Bridge-Hop', risk_boost: 10 },
    ],
    all_typologies: [
      { typology: 'Investment Scam / Pig Butchering', confidence: 91.4 },
      { typology: 'Ransomware', confidence: 4.2 },
      { typology: 'Phishing', confidence: 2.8 },
      { typology: 'Darknet Transaction', confidence: 1.2 },
      { typology: 'Task-based Fraud', confidence: 0.4 },
    ],
    investigative_recommendation:
      'High-confidence investment scam profile. Issue urgent preservation request to Binance compliance team. Escalate to MLAT for international cooperation.',
    methodology: 'Bayesian classifier · rule-based patterns · anomaly scoring',
    pre_confirmation_flag: true,
    pre_confirmation_confidence: 89.1,
  },
  cross_chain_analysis: {
    bridge_events_detected: 1,
    defi_events_detected: 0,
    cross_chain_risk: 'HIGH',
    summary: 'Funds bridged to BSC via Wormhole. Follow-up tracing required on destination chain.',
    bridge_hops: [
      {
        bridge_name: 'Wormhole',
        bridge_contract: '0x3ee18B2214AFF97000D974cf647E7C347E8fa585',
        destination_correlations: [
          { destination_chain: 'bsc', estimated_destination_address: '0xBSC...dest' },
        ],
        analyst_note: 'Large ETH→BSC transfer 3 hours after victim complaint.',
      },
    ],
    defi_hops: [],
  },
}

export const MOCK_STATS = {
  total_cases: 24,
  mixer_touched_count: 9,
  bridge_detected_count: 7,
  risk_distribution: { LOW: 4, MEDIUM: 8, HIGH: 7, CRITICAL: 5 },
  typology_distribution: {
    'Investment Scam': 11,
    Ransomware: 5,
    Phishing: 4,
    'Task-based': 3,
    Darknet: 1,
  },
  top_exchanges: [
    ['Binance', 8],
    ['Coinbase', 5],
    ['Bybit', 4],
    ['OKX', 3],
    ['Kraken', 2],
  ],
}
