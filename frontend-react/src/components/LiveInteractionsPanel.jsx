// src/components/LiveInteractionsPanel.jsx
// White background & Black text Backend Request & Pipeline Interaction Stream

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
    <div className="bg-white border border-zinc-200 rounded-lg p-5 font-sans shadow-sm">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-200">
        <div className="flex items-center gap-2.5">
          <Terminal size={16} className="text-black" />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black flex items-center gap-2">
              Request & Pipeline Telemetry
              <span className="w-1.5 h-1.5 rounded-full bg-black live-dot" />
            </h3>
            <p className="text-[11px] text-zinc-600 mt-0.5 font-mono">
              Live logging of API calls, forensic pipeline execution, and latency benchmarks
            </p>
          </div>
        </div>

        {/* Stats Pill Badges */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-300 text-zinc-800">
            Latency: <strong className="text-black font-semibold">{stats.avgLatency}ms</strong>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-300 text-zinc-800">
            WS Clients: <strong className="text-black font-semibold">{stats.activeWs}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPaused((p) => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors shadow-2xs ${
                isPaused
                  ? 'bg-black border-black text-white'
                  : 'bg-zinc-100 border-zinc-300 text-black hover:bg-zinc-200'
              }`}
              title={isPaused ? 'Resume stream' : 'Pause stream'}
            >
              {isPaused ? <Play size={11} /> : <Pause size={11} />}
              <span>{isPaused ? 'Paused' : 'Live'}</span>
            </button>
            <button
              onClick={() => setInteractions([])}
              className="p-1.5 rounded-md bg-zinc-100 border border-zinc-300 text-zinc-600 hover:text-black hover:border-zinc-400 transition-colors shadow-2xs"
              title="Clear interaction log"
            >
              <Trash2 size={12} />
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
            className={`px-2.5 py-1 text-xs font-mono rounded-md whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-black text-white font-semibold shadow-xs'
                : 'bg-zinc-100 text-zinc-700 hover:text-black hover:bg-zinc-200 border border-zinc-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Interaction Stream List / Console */}
      <div
        ref={terminalRef}
        className="bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden font-mono text-xs max-h-[360px] overflow-y-auto"
      >
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            <Activity size={20} className="mx-auto mb-2 opacity-60 animate-pulse text-black" />
            Listening for backend interactions... Trigger wallet traces to inspect telemetry.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {filtered.map((item) => {
              const sc = item.status_code || 200
              const isOk = sc < 400
              const methodColor =
                item.method === 'POST'
                  ? 'text-white bg-black border-black font-bold'
                  : item.method === 'GET'
                  ? 'text-black bg-zinc-200 border-zinc-300 font-semibold'
                  : 'text-zinc-900 bg-zinc-100 border-zinc-300 font-semibold'

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedInteraction(item)}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 p-2.5 hover:bg-zinc-100/90 cursor-pointer transition-colors group"
                >
                  {/* Left: Method, Path, Timestamp */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap">{item.timestamp}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${methodColor}`}>
                      {item.method}
                    </span>
                    <span className="text-black truncate max-w-[240px] sm:max-w-[360px] group-hover:underline transition-colors font-medium">
                      {item.path}
                    </span>
                    {item.query && (
                      <span className="text-[10.5px] text-zinc-500 hidden md:inline truncate max-w-[150px]">
                        ?{item.query}
                      </span>
                    )}
                  </div>

                  {/* Right: Latency, Status Code, Category Badge */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10.5px] text-zinc-600 font-medium">{item.elapsed_ms}ms</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        isOk
                          ? 'text-black bg-zinc-200 border border-zinc-300'
                          : 'text-white bg-black border border-black'
                      }`}
                    >
                      {sc}
                    </span>
                    <span className="text-[10px] text-zinc-600 uppercase px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 hidden sm:inline font-medium">
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="bg-white border border-zinc-300 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-zinc-50">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-black text-white font-bold">
                    {selectedInteraction.method}
                  </span>
                  <span className="text-black font-semibold truncate max-w-[340px]">
                    {selectedInteraction.path}
                  </span>
                  <span className="text-black font-bold ml-1 font-mono">
                    [{selectedInteraction.status_code}]
                  </span>
                </div>
                <button
                  onClick={() => setSelectedInteraction(null)}
                  className="p-1 rounded text-zinc-500 hover:text-black hover:bg-zinc-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4 overflow-y-auto font-mono text-xs">
                {/* Telemetry metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2.5 rounded bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-500 block mb-0.5 text-[10px] font-semibold">REQUEST ID</span>
                    <strong className="text-black break-all font-mono font-medium">{selectedInteraction.id}</strong>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-500 block mb-0.5 text-[10px] font-semibold">TIMESTAMP</span>
                    <strong className="text-black font-medium">{selectedInteraction.timestamp}</strong>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-500 block mb-0.5 text-[10px] font-semibold">LATENCY</span>
                    <strong className="text-black font-bold">{selectedInteraction.elapsed_ms} ms</strong>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-500 block mb-0.5 text-[10px] font-semibold">CLIENT IP</span>
                    <strong className="text-black font-medium">{selectedInteraction.client_ip}</strong>
                  </div>
                </div>

                {/* Request Payload */}
                {selectedInteraction.request_preview && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-[11px] text-zinc-600 font-semibold">
                      <span>Request Payload</span>
                      <button
                        onClick={() => copyToClipboard(selectedInteraction.request_preview, 'req')}
                        className="flex items-center gap-1 text-black hover:underline"
                      >
                        {copiedField === 'req' ? <Check size={11} /> : <Copy size={11} />}
                        {copiedField === 'req' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-black text-[11px] overflow-x-auto whitespace-pre-wrap max-h-40">
                      {selectedInteraction.request_preview}
                    </pre>
                  </div>
                )}

                {/* Response Payload */}
                {selectedInteraction.response_preview && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-[11px] text-zinc-600 font-semibold">
                      <span>Response Payload</span>
                      <button
                        onClick={() => copyToClipboard(selectedInteraction.response_preview, 'resp')}
                        className="flex items-center gap-1 text-black hover:underline"
                      >
                        {copiedField === 'resp' ? <Check size={11} /> : <Copy size={11} />}
                        {copiedField === 'resp' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-3 rounded-md bg-zinc-50 border border-zinc-200 text-black text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48">
                      {selectedInteraction.response_preview}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
                <button
                  onClick={() => setSelectedInteraction(null)}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-black text-white hover:bg-zinc-800 transition-all shadow-xs"
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
