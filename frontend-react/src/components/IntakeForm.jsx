// src/components/IntakeForm.jsx
import { useState } from 'react'
import { Search, Loader2, AlertTriangle } from 'lucide-react'
import { submitComplaint, MOCK_CASE } from '../lib/api'

const SAMPLES = [
  { label: 'BTC Scam', addr: '1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF', chain: 'bitcoin' },
  { label: 'ETH Fraud', addr: '0xDe0B295669a9FD93d5F28D9Ec85E40f4cb697BA', chain: 'ethereum' },
  { label: 'ETH Darknet', addr: '0x000000000000000000000000000000deadbeef', chain: 'ethereum' },
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
    setLoading(true)
    setError(null)
    try {
      const result = await submitComplaint({ address, chain, category, officer })
      onResult(result)
    } catch (err) {
      // Fallback to demo mode with mock data
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

  const inputCls = 'bg-panel-alt border border-border text-text-main font-mono text-sm px-3 py-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors w-full'
  const labelCls = 'text-xs text-text-dim mb-1.5 block'

  return (
    <section className="bg-panel border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Report a Suspect Wallet</h2>
      <p className="text-text-dim text-sm mb-5">
        Simulates a complaint from NCRP / SAHYOG. Triggers: blockchain trace → VASP attribution →
        cross-chain bridge detection → DeFi detection → AI/ML typology classification.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Wallet Address</label>
          <input
            className={inputCls}
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. 0xDe0B295669a9FD93d5F28D9Ec85E40f4cb697BA"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Chain</label>
            <select className={inputCls} value={chain} onChange={e => setChain(e.target.value)}>
              <option value="bitcoin">Bitcoin</option>
              <option value="ethereum">Ethereum</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Fraud Category</label>
            <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Investigating Officer (optional)</label>
          <input
            className={inputCls}
            type="text"
            value={officer}
            onChange={e => setOfficer(e.target.value)}
            placeholder="Insp. name / badge no."
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-accent text-bg font-semibold text-sm px-5 py-2.5 rounded-md hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? 'Tracing…' : 'Trace & Attribute'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-2 text-sm text-red bg-red/10 border border-red/30 rounded-md px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sample wallets */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-dim">Try a sample:</span>
        {SAMPLES.map(s => (
          <button
            key={s.addr}
            type="button"
            onClick={() => loadSample(s)}
            className="text-xs font-mono px-3 py-1 rounded-full bg-panel-alt border border-border text-text-dim hover:border-accent hover:text-accent transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>
    </section>
  )
}
