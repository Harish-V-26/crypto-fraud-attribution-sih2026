// src/components/LiveInteractionsPanel.jsx
// Live Backend Request & Pipeline Interaction Stream with Payload Inspector

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Terminal,
  Activity,
  Pause,
  Play,
  Trash2,
  Filter,
  Code,
  Clock,
  Zap,
  ArrowRight,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check
} from 'lucide-react'
import { fetchLiveInteractions, connectRealtimeWebSocket } from '../lib/api'

export default function LiveInteractionsPanel() {
  const [interactions, setInteractions] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [isPaused, setIsPaused] = useState(false)
  const [selectedInteraction, setSelectedInteraction] = useState(null)
  const [copiedField, setCopiedField] = useState(null)
  const [stats, setStats] = useState({ total: 0, activeWs: 1, avgLatency: 0 })
  const terminalRef = useRef(null)

  // 1. Initial REST fetch and WebSocket stream listener
  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetchLiveInteractions(50, activeCategory)
        if (res.interactions) {
          setInteractions(res.interactions)
          updateStats(res.interactions, res.active_ws_clients)
        }
      } catch (e) {
        console.warn('Interactions fetch error:', e)
      }
    }
    loadInitial()

    const socket = connectRealtimeWebSocket((msg) => {
      if (msg.type === 'interaction' && msg.interaction) {
        if (!isPaused) {
          setInteractions((prev) => {
            const next = [msg.interaction, ...prev.slice(0, 79)]
            updateStats(next)
            return next
          })
        }
      }
    })

    // Poll fallback every 4s
    const interval = setInterval(() => {
      if (!isPaused) {
        loadInitial()
      }
    }, 4000)

    return () => {
      socket.close()
      clearInterval(interval)
    }
  }, [isPaused, activeCategory])

  function updateStats(list, wsCount) {
    if (!list || !list.length) return
    const total = list.length
    const sumLatency = list.reduce((acc, cur) => acc + (cur.elapsed_ms || 0), 0)
    setStats({
      total: list.length,
      activeWs: wsCount !== undefined ? wsCount : 1,
      avgLatency: total ? Math.round(sumLatency / total) : 0,
    })
  }

  const filtered = activeCategory === 'all'
    ? interactions
    : interactions.filter((i) => (i.category || '').toLowerCase() === activeCategory.toLowerCase())

  const categories = [
    { id: 'all', label: 'All Interactions' },
    { id: 'complaint', label: 'Complaints & Ingest' },
    { id: 'trace', label: 'BFS Traces' },
    { id: 'market', label: 'Crypto Market' },
    { id: 'gas', label: 'Gas & Fees' },
    { id: 'blockchain', label: 'Blockchain RPC' },
    { id: 'mempool', label: 'Mempool Stream' },
  ]

  function copyToClipboard(text, field) {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2))
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="bg-panel border border-border rounded-lg p-5 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Terminal size={17} className="text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-text-main flex items-center gap-2">
              Live Backend & Pipeline Interaction Stream
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-text-dim">
              Real-time telemetry of incoming API requests, forensic pipeline execution, and latency metrics
            </p>
          </div>
        </div>

        {/* Stats Pill Badges */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-2.5 py-1 rounded bg-panel-alt border border-border text-text-dim">
            Avg Latency: <strong className="text-emerald-400">{stats.avgLatency} ms</strong>
          </div>
          <div className="px-2.5 py-1 rounded bg-panel-alt border border-border text-text-dim">
            WS Clients: <strong className="text-cyan-400">{stats.activeWs}</strong>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPaused((p) => !p)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-semibold transition-colors ${
                isPaused
                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-400'
                  : 'bg-panel-alt border-border text-text-dim hover:text-text-main'
              }`}
              title={isPaused ? 'Resume stream' : 'Pause stream'}
            >
              {isPaused ? <Play size={12} /> : <Pause size={12} />}
              <span>{isPaused ? 'Paused' : 'Streaming'}</span>
            </button>
            <button
              onClick={() => setInteractions([])}
              className="p-1 rounded bg-panel-alt border border-border text-text-dim hover:text-rose-400 transition-colors"
              title="Clear interaction log"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 text-xs font-mono rounded-md whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-accent text-bg font-semibold'
                : 'bg-panel-alt text-text-dim hover:text-text-main border border-border'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Interaction Stream List / Console */}
      <div
        ref={terminalRef}
        className="bg-[#070b0e] border border-border rounded-lg overflow-hidden font-mono text-xs max-h-[380px] overflow-y-auto"
      >
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-text-dim text-xs">
            <Activity size={24} className="mx-auto mb-2 opacity-40 animate-pulse text-accent" />
            Listening for backend interactions... Make requests or trace a wallet to view live data.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((item) => {
              const sc = item.status_code || 200
              const isOk = sc < 400
              const methodColor =
                item.method === 'POST'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                  : item.method === 'GET'
                  ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40'
                  : 'text-amber-400 bg-amber-950/40 border-amber-800/40'

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedInteraction(item)}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 p-2.5 hover:bg-[#0e161c] cursor-pointer transition-colors group"
                >
                  {/* Left: Method, Path, Timestamp */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] text-text-dim whitespace-nowrap">{item.timestamp}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${methodColor}`}>
                      {item.method}
                    </span>
                    <span className="text-text-main truncate max-w-[240px] sm:max-w-[360px] group-hover:text-accent transition-colors font-medium">
                      {item.path}
                    </span>
                    {item.query && (
                      <span className="text-[10.5px] text-text-dim hidden md:inline truncate max-w-[150px]">
                        ?{item.query}
                      </span>
                    )}
                  </div>

                  {/* Right: Latency, Status Code, Category Badge */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10.5px] text-text-dim">{item.elapsed_ms} ms</span>
                    <span
                      className={`text-[10.5px] px-1.5 py-0.5 rounded font-semibold ${
                        isOk
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : 'text-rose-400 bg-rose-950/40'
                      }`}
                    >
                      {sc}
                    </span>
                    <span className="text-[10px] text-text-dim uppercase px-1.5 py-0.5 rounded bg-panel-alt border border-border hidden sm:inline">
                      {item.category}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal / Payload Inspector Drawer */}
      <AnimatePresence>
        {selectedInteraction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-panel border border-accent/40 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-panel-alt">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-accent text-bg font-bold">
                    {selectedInteraction.method}
                  </span>
                  <span className="text-text-main font-semibold truncate max-w-[340px]">
                    {selectedInteraction.path}
                  </span>
                  <span className="text-emerald-400 font-bold ml-1">
                    {selectedInteraction.status_code}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedInteraction(null)}
                  className="p-1 rounded text-text-dim hover:text-text-main hover:bg-panel transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4 overflow-y-auto font-mono text-xs">
                {/* Telemetry metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-panel-alt border border-border">
                    <span className="text-text-dim block mb-0.5">REQUEST ID</span>
                    <strong className="text-text-main break-all">{selectedInteraction.id}</strong>
                  </div>
                  <div className="p-2 rounded bg-panel-alt border border-border">
                    <span className="text-text-dim block mb-0.5">TIMESTAMP</span>
                    <strong className="text-text-main">{selectedInteraction.timestamp}</strong>
                  </div>
                  <div className="p-2 rounded bg-panel-alt border border-border">
                    <span className="text-text-dim block mb-0.5">LATENCY</span>
                    <strong className="text-emerald-400">{selectedInteraction.elapsed_ms} ms</strong>
                  </div>
                  <div className="p-2 rounded bg-panel-alt border border-border">
                    <span className="text-text-dim block mb-0.5">CLIENT IP</span>
                    <strong className="text-text-main">{selectedInteraction.client_ip}</strong>
                  </div>
                </div>

                {/* Request Payload */}
                {selectedInteraction.request_preview && (
                  <div>
                    <div className="flex items-center justify-between mb-1 text-[11px] text-text-dim">
                      <span>Request Payload</span>
                      <button
                        onClick={() => copyToClipboard(selectedInteraction.request_preview, 'req')}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        {copiedField === 'req' ? <Check size={11} /> : <Copy size={11} />}
                        {copiedField === 'req' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-3 rounded bg-[#070b0e] border border-border text-amber-300 text-[11px] overflow-x-auto whitespace-pre-wrap max-h-40">
                      {selectedInteraction.request_preview}
                    </pre>
                  </div>
                )}

                {/* Response Payload */}
                {selectedInteraction.response_preview && (
                  <div>
                    <div className="flex items-center justify-between mb-1 text-[11px] text-text-dim">
                      <span>Response Payload</span>
                      <button
                        onClick={() => copyToClipboard(selectedInteraction.response_preview, 'resp')}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        {copiedField === 'resp' ? <Check size={11} /> : <Copy size={11} />}
                        {copiedField === 'resp' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-3 rounded bg-[#070b0e] border border-border text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                      {selectedInteraction.response_preview}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-border bg-panel-alt flex justify-end">
                <button
                  onClick={() => setSelectedInteraction(null)}
                  className="px-4 py-1.5 rounded text-xs font-semibold bg-accent text-bg hover:brightness-110 transition-all"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
