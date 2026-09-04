// src/components/LiveMonitor.jsx
// Real-time Ethereum monitor powered by Ethers.js + Infura

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Wifi, Search, Loader2, AlertTriangle, CheckCircle2, Database, Hash, Zap, Activity } from 'lucide-react'
import {
  getAddressInfo,
  getLatestBlock,
  getGasPrice,
  getTransaction,
  simulatePreConfirmationCheck,
  ethers,
} from '../lib/ethers'

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="bg-panel-alt rounded-lg p-3.5 border border-border">
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={12} className="text-text-dim" />}
        <span className="text-[11px] text-text-dim font-mono">{label}</span>
      </div>
      <div className="font-mono font-semibold text-base break-all" style={{ color: color || '#dfe6e8' }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-text-dim mt-1 font-mono">{sub}</div>}
    </div>
  )
}

export default function LiveMonitor() {
  const [activeTab, setActiveTab] = useState('address') // 'address' | 'block' | 'tx' | 'precheck'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Inputs
  const [addressInput, setAddressInput] = useState('')
  const [txInput, setTxInput] = useState('')
  const [preFrom, setPreFrom] = useState('')
  const [preTo, setPreTo] = useState('')
  const [preValue, setPreValue] = useState('')

  const inputCls = 'bg-panel-alt border border-border text-text-main font-mono text-sm px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-accent w-full'

  const run = useCallback(async (fn) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await fn()
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  async function queryAddress() {
    await run(() => getAddressInfo(addressInput.trim()))
  }

  async function queryBlock() {
    const [block, gas] = await Promise.all([getLatestBlock(), getGasPrice()]).catch(e => { throw e })
    return { ...block, ...gas }
  }

  async function queryTx() {
    await run(() => getTransaction(txInput.trim()))
  }

  async function runPreCheck() {
    // Simulate pre-confirmation check (no network call needed)
    const check = simulatePreConfirmationCheck(preFrom.trim(), preTo.trim(), preValue.trim())
    setResult(check)
  }

  const tabs = [
    { id: 'address', label: 'Address Lookup', icon: Database },
    { id: 'block',   label: 'Latest Block',   icon: Activity },
    { id: 'tx',      label: 'Transaction',    icon: Hash },
    { id: 'precheck',label: 'Pre-Confirm ML', icon: Zap },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-panel border border-border rounded-lg p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Wifi size={15} className="text-accent" />
        <h3 className="font-semibold text-sm text-text-dim">Live Ethereum Monitor</h3>
        <span className="ml-auto text-[10px] font-mono text-text-dim border border-border px-2 py-0.5 rounded">
          Powered by Infura · Ethers.js v6
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-panel-alt rounded-lg p-1 border border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setResult(null); setError(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md font-medium transition-all ${
              activeTab === id
                ? 'bg-accent text-bg'
                : 'text-text-dim hover:text-text-main'
            }`}
          >
            <Icon size={11} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="mb-3 space-y-2">
        {activeTab === 'address' && (
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
              placeholder="0xDe0B295669a9FD93d5F28D9Ec85E40f4cb697BA"
            />
            <button
              onClick={queryAddress}
              disabled={loading || !addressInput}
              className="flex items-center gap-1.5 bg-accent text-bg font-semibold text-sm px-4 py-2 rounded-md hover:brightness-110 disabled:opacity-50 whitespace-nowrap transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Lookup
            </button>
          </div>
        )}

        {activeTab === 'block' && (
          <button
            onClick={() => run(queryBlock)}
            disabled={loading}
            className="flex items-center gap-2 bg-accent text-bg font-semibold text-sm px-4 py-2 rounded-md hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
            Fetch Latest Block
          </button>
        )}

        {activeTab === 'tx' && (
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={txInput}
              onChange={e => setTxInput(e.target.value)}
              placeholder="0x transaction hash…"
            />
            <button
              onClick={queryTx}
              disabled={loading || !txInput}
              className="flex items-center gap-1.5 bg-accent text-bg font-semibold text-sm px-4 py-2 rounded-md hover:brightness-110 disabled:opacity-50 whitespace-nowrap transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Hash size={14} />}
              Lookup
            </button>
          </div>
        )}

        {activeTab === 'precheck' && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-text-dim mb-1 block">From Address</label>
                <input className={inputCls} value={preFrom} onChange={e => setPreFrom(e.target.value)} placeholder="0x sender…" />
              </div>
              <div>
                <label className="text-[11px] text-text-dim mb-1 block">To Address</label>
                <input className={inputCls} value={preTo} onChange={e => setPreTo(e.target.value)} placeholder="0x recipient…" />
              </div>
              <div>
                <label className="text-[11px] text-text-dim mb-1 block">Value (ETH)</label>
                <input className={inputCls} value={preValue} onChange={e => setPreValue(e.target.value)} placeholder="e.g. 15.5" type="number" />
              </div>
            </div>
            <button
              onClick={runPreCheck}
              className="flex items-center gap-2 bg-accent text-bg font-semibold text-sm px-4 py-2 rounded-md hover:brightness-110 transition-all"
            >
              <Zap size={14} /> Run Pre-Confirmation ML Check
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red bg-red/10 border border-red/30 rounded-md px-3 py-2.5 mb-3">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {/* Pre-check result */}
          {activeTab === 'precheck' && (
            <div
              className="p-4 rounded-lg border"
              style={{
                background: result.flagged ? '#3a1e1e' : '#1e3a2e',
                borderColor: result.flagged ? '#c85a4f50' : '#2d5a4350',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.flagged
                  ? <AlertTriangle size={16} className="text-red" />
                  : <CheckCircle2 size={16} className="text-green" />}
                <span className="font-semibold text-sm" style={{ color: result.flagged ? '#f07a6e' : '#6fd196' }}>
                  {result.flagged ? 'FLAGGED — Suspicious Transaction' : 'CLEARED — Normal Pattern'}
                </span>
                <span className="ml-auto font-mono text-xs text-text-dim">
                  Risk Score: {result.pre_confirmation_risk_score}/100
                </span>
              </div>
              <p className="text-xs text-text-dim leading-relaxed">{result.recommendation}</p>
              {result.flags?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {result.flags.map((f, i) => (
                    <li key={i} className="text-xs font-mono text-red flex items-center gap-1">
                      <span>•</span> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Generic key-value result */}
          {activeTab !== 'precheck' && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result).map(([k, v]) => (
                <StatCard
                  key={k}
                  label={k.replace(/_/g, ' ').toUpperCase()}
                  value={String(v ?? '—')}
                  color={k.includes('balance') || k.includes('eth') ? '#4fb3a9'
                    : k === 'status' && v === 'SUCCESS' ? '#6fd196'
                    : k === 'status' && v === 'FAILED' ? '#f07a6e'
                    : undefined}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
