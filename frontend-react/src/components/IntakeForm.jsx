// src/components/IntakeForm.jsx
import { useState } from 'react'
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { submitComplaint, MOCK_CASE } from '../lib/api'

const SAMPLES = [
  { label: 'BTC Scam (Layering)', addr: '1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF', chain: 'bitcoin' },
  { label: 'ETH Mixer Exit', addr: '0xDe0B295669a9FD93d5F28D9Ec85E40f4cb697BA', chain: 'ethereum' },
  { label: 'ETH Darknet Phish', addr: '0x000000000000000000000000000000deadbeef', chain: 'ethereum' },
]

const CATEGORIES = [
  'Investment scam',
  'Task-based fraud',
  'Sextortion',
  'Ransomware',
  'Phishing',
  'Darknet transaction',
]

export default function IntakeForm({ onResult, onDemoMode }) {
  const [address, setAddress] = useState('')
  const [chain, setChain] = useState('ethereum')
  const [category, setCategory] = useState('Investment scam')
  const [officer, setOfficer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!address.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await submitComplaint({ address: address.trim(), chain, category, officer })
      onResult(result)
    } catch (err) {
      console.warn('Backend unavailable, using demo data:', err.message)
      const demo = { ...MOCK_CASE, victim_reported_address: address || MOCK_CASE.victim_reported_address }
      onResult(demo)
      onDemoMode?.()
    } finally {
      setLoading(false)
    }
  }

  function loadSample(s) {
    setAddress(s.addr)
    setChain(s.chain)
  }

  const inputCls = 'bg-panel-alt/60 border border-border text-text-main font-mono text-xs px-3 py-2.5 rounded-lg focus:outline-none focus:border-zinc-500 transition-colors w-full placeholder:text-zinc-600'
  const labelCls = 'text-[11px] font-medium text-text-dim mb-1.5 block'

  return (
    <div className="bg-panel border border-border/80 rounded-xl p-5 sm:p-6 shadow-minimal transition-all">
      <div className="mb-5">
        <h3 className="text-sm font-medium text-text-main">Suspect Address Investigation</h3>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          Ingest complaint to execute multi-hop BFS tracing, VASP attribution, bridge detection, and AI/ML classification.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Victim-Reported Address</label>
          <input
            className={inputCls}
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="0x... or 1... / bc1..."
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Blockchain</label>
            <select className={inputCls} value={chain} onChange={e => setChain(e.target.value)}>
              <option value="ethereum">Ethereum (ETH)</option>
              <option value="bitcoin">Bitcoin (BTC)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Fraud Typology Category</label>
            <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Officer / Case Badge</label>
            <input
              className={inputCls}
              type="text"
              value={officer}
              onChange={e => setOfficer(e.target.value)}
              placeholder="e.g. INSP-7029"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {/* Sample quick selectors */}
          <div className="hidden sm:flex items-center gap-2 text-[11px]">
            <span className="text-text-muted">Preset:</span>
            {SAMPLES.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => loadSample(s)}
                className="font-mono text-[10.5px] px-2.5 py-0.5 rounded-full border border-border/80 text-text-dim hover:text-white hover:border-zinc-500 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs px-5 py-2 rounded-lg disabled:opacity-50 transition-all shadow-minimal"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            <span>{loading ? 'Analyzing On-Chain Flow…' : 'Execute Forensics'}</span>
            {!loading && <ArrowRight size={13} />}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-200 bg-zinc-900 border border-zinc-700 rounded-lg p-3 font-mono">
          <AlertCircle size={14} className="flex-shrink-0 text-white" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
