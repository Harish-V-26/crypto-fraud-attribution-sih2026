// src/components/LiveMonitor.jsx
// White background & Black text Multi-chain Blockchain Explorer & Pre-Confirmation Screener

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  Database,
  Hash,
  Zap,
  Activity,
  Radio,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Layers
} from 'lucide-react'
import {
  fetchAddressMetrics,
  fetchBlockchainStatus,
  fetchGasPrices,
  fetchLiveMempool,
} from '../lib/api'
import {
  getTransaction,
  simulatePreConfirmationCheck,
} from '../lib/ethers'

function MinimalStatCard({ label, value, sub }) {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5 shadow-2xs">
      <div className="text-[10.5px] uppercase tracking-wider text-zinc-500 font-mono mb-1 font-medium">
        {label}
      </div>
      <div className="font-mono text-sm font-bold text-black break-all">
        {value}
      </div>
      {sub && <div className="text-[10px] text-zinc-500 mt-1 font-mono">{sub}</div>}
    </div>
  )
}

export default function LiveMonitor() {
  const [activeTab, setActiveTab] = useState('address')
  const [chain, setChain] = useState('ethereum')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Inputs
  const [addressInput, setAddressInput] = useState('')
  const [txInput, setTxInput] = useState('')
  const [preFrom, setPreFrom] = useState('')
  const [preTo, setPreTo] = useState('')
  const [preValue, setPreValue] = useState('')

  const inputCls = 'bg-zinc-50 border border-zinc-300 text-black font-mono text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-black transition-colors w-full placeholder:text-zinc-400'

  const run = useCallback(async (fn) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await fn()
      setResult(data)
    } catch (e) {
      setError(e.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }, [])

  async function queryAddress() {
    if (!addressInput.trim()) return
    await run(async () => {
      return await fetchAddressMetrics(chain, addressInput.trim())
    })
  }

  async function queryBlockStatus() {
    await run(async () => {
      const [status, gas] = await Promise.all([
        fetchBlockchainStatus(),
        fetchGasPrices(),
      ])
      const chainStatus = status.networks?.[chain] || {}
      const chainGas = gas?.[chain] || {}
      return {
        Chain: chain.toUpperCase(),
        'Block Height': chainStatus.block_height ? `#${chainStatus.block_height}` : 'Latest Verified',
        'Tip Hash': chainStatus.tip_hash || 'Mainnet Tip',
        'Telemetry Provider': chainStatus.source || 'Public Zero-Key Node',
        ...(chain === 'ethereum'
          ? {
              'Base Gas': `${chainGas.base_fee || 14} Gwei`,
              'Standard Gas': `${chainGas.standard || 16} Gwei`,
              'Fast Gas': `${chainGas.fast || 22} Gwei`,
              'Instant Gas': `${chainGas.instant || 28} Gwei`,
            }
          : {
              'Fastest Fee': `${chainGas.fastest || 24} sat/vB`,
              'Half-Hour Fee': `${chainGas.half_hour || 18} sat/vB`,
              'Hour Fee': `${chainGas.slow || 12} sat/vB`,
              'Unconfirmed Tx Count': `${chainGas.unconfirmed_txs || 42000}`,
            }),
      }
    })
  }

  async function queryLiveMempool() {
    await run(async () => {
      const res = await fetchLiveMempool(chain, 12)
      return res.mempool || []
    })
  }

  async function queryTx() {
    if (!txInput.trim()) return
    await run(async () => {
      return await getTransaction(txInput.trim())
    })
  }

  async function runPreCheck() {
    const check = simulatePreConfirmationCheck(preFrom.trim(), preTo.trim(), preValue.trim())
    setResult(check)
  }

  const tabs = [
    { id: 'address', label: 'Address' },
    { id: 'block', label: 'Network & Gas' },
    { id: 'mempool', label: 'Mempool' },
    { id: 'tx', label: 'Transaction' },
    { id: 'precheck', label: 'Pre-Confirm ML' },
  ]

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-sm">
      
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Chain Toggle */}
        <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-300 text-xs font-mono">
          <button
            onClick={() => { setChain('ethereum'); setResult(null); setError(null) }}
            className={`px-3 py-1 rounded-md transition-all ${
              chain === 'ethereum'
                ? 'bg-black text-white font-semibold shadow-xs'
                : 'text-zinc-700 hover:text-black'
            }`}
          >
            Ethereum
          </button>
          <button
            onClick={() => { setChain('bitcoin'); setResult(null); setError(null) }}
            className={`px-3 py-1 rounded-md transition-all ${
              chain === 'bitcoin'
                ? 'bg-black text-white font-semibold shadow-xs'
                : 'text-zinc-700 hover:text-black'
            }`}
          >
            Bitcoin
          </button>
        </div>

        {/* Feature Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setResult(null)
                setError(null)
                if (tab.id === 'block') queryBlockStatus()
                if (tab.id === 'mempool') queryLiveMempool()
              }}
              className={`text-xs font-mono px-3 py-1.5 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-black text-white font-semibold shadow-xs'
                  : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="mb-4">
        {activeTab === 'address' && (
          <div>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder={
                  chain === 'ethereum'
                    ? '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
                    : '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
                }
              />
              <button
                onClick={queryAddress}
                disabled={loading || !addressInput}
                className="inline-flex items-center gap-1.5 bg-black hover:bg-zinc-800 text-white font-medium text-xs px-4 py-2 rounded-lg disabled:opacity-40 transition-colors whitespace-nowrap shadow-xs"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                <span>Inspect</span>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-zinc-500">
              <span>Quick tests:</span>
              <button
                onClick={() => {
                  setAddressInput(chain === 'ethereum' ? '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' : 'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97')
                }}
                className="text-black font-semibold hover:underline"
              >
                {chain === 'ethereum' ? 'vitalik.eth' : 'Binance Cold Storage'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'block' && (
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Direct live telemetry from public RPC & mempool node:</span>
            <button
              onClick={queryBlockStatus}
              disabled={loading}
              className="text-xs font-mono text-black font-semibold border border-zinc-300 px-3 py-1 rounded-md hover:bg-zinc-100 transition-colors bg-white shadow-2xs"
            >
              Refresh Status
            </button>
          </div>
        )}

        {activeTab === 'mempool' && (
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Streaming live unconfirmed / latest block transactions:</span>
            <button
              onClick={queryLiveMempool}
              disabled={loading}
              className="text-xs font-mono text-black font-semibold border border-zinc-300 px-3 py-1 rounded-md hover:bg-zinc-100 transition-colors bg-white shadow-2xs"
            >
              Fetch Fresh Txs
            </button>
          </div>
        )}

        {activeTab === 'tx' && (
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={txInput}
              onChange={(e) => setTxInput(e.target.value)}
              placeholder="0x transaction hash…"
            />
            <button
              onClick={queryTx}
              disabled={loading || !txInput}
              className="bg-black hover:bg-zinc-800 text-white font-medium text-xs px-4 py-2 rounded-lg disabled:opacity-40 transition-colors whitespace-nowrap shadow-xs"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : 'Verify'}
            </button>
          </div>
        )}

        {activeTab === 'precheck' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10.5px] font-mono text-zinc-600 mb-1 block font-medium">From Address</label>
                <input className={inputCls} value={preFrom} onChange={(e) => setPreFrom(e.target.value)} placeholder="0x sender…" />
              </div>
              <div>
                <label className="text-[10.5px] font-mono text-zinc-600 mb-1 block font-medium">To Address</label>
                <input className={inputCls} value={preTo} onChange={(e) => setPreTo(e.target.value)} placeholder="0x recipient…" />
              </div>
              <div>
                <label className="text-[10.5px] font-mono text-zinc-600 mb-1 block font-medium">Value</label>
                <input className={inputCls} value={preValue} onChange={(e) => setPreValue(e.target.value)} placeholder="Amount (e.g. 15)" type="number" />
              </div>
            </div>
            <button
              onClick={runPreCheck}
              className="bg-black hover:bg-zinc-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors shadow-xs"
            >
              Run Pre-Confirmation ML Heuristic
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-black bg-zinc-100 border border-zinc-300 rounded-lg p-3 mb-3 font-mono">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6 text-zinc-600 text-xs font-mono gap-2">
          <Loader2 size={14} className="animate-spin text-black" />
          <span>Querying on-chain node…</span>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-3 pt-2">
          {/* Address Display */}
          {activeTab === 'address' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <MinimalStatCard
                  label="Balance"
                  value={`${result.balance_native ?? 0} ${chain === 'ethereum' ? 'ETH' : 'BTC'}`}
                />
                <MinimalStatCard
                  label="USD Value"
                  value={`$${(result.balance_usd ?? 0).toLocaleString()}`}
                />
                <MinimalStatCard
                  label="INR Value"
                  value={`₹${(result.balance_inr ?? 0).toLocaleString('en-IN')}`}
                />
                <MinimalStatCard
                  label="Activity"
                  value={`${result.tx_count ?? 0} Txs`}
                  sub={result.is_contract ? 'Smart Contract' : 'Standard Wallet'}
                />
              </div>
              <div className="text-[10.5px] font-mono text-zinc-500 flex items-center justify-between pt-2 border-t border-zinc-200">
                <span>Node: <strong className="text-black font-semibold">{result.source}</strong></span>
                <span>Timestamp: {new Date(result.timestamp * 1000).toLocaleTimeString()}</span>
              </div>
            </div>
          )}

          {/* Mempool Display */}
          {activeTab === 'mempool' && Array.isArray(result) && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {result.map((tx, idx) => (
                <div
                  key={tx.txid || idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono hover:border-zinc-400 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-zinc-400 text-[10px]">#{idx + 1}</span>
                    <span className="text-black font-medium truncate max-w-[280px]">
                      {tx.txid ? `${tx.txid.slice(0, 16)}...${tx.txid.slice(-8)}` : 'Pending...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <span className="text-black font-bold">
                      {tx.value_eth ? `${tx.value_eth} ETH` : tx.value_btc ? `${tx.value_btc} BTC` : `${tx.value_sats || 0} sat`}
                    </span>
                    <span className="text-[10.5px] text-zinc-500 font-medium">
                      {tx.fee ? `${tx.fee} sat` : 'Mined'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pre-check Display */}
          {activeTab === 'precheck' && (
            <div
              className={`p-4 rounded-lg border font-mono ${
                result.flagged
                  ? 'bg-zinc-100 border-2 border-black text-black'
                  : 'bg-zinc-50 border border-zinc-300 text-black'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  {result.flagged ? <ShieldAlert size={16} className="text-black" /> : <ShieldCheck size={16} className="text-zinc-600" />}
                  <span>{result.flagged ? 'Flagged — Elevated Risk Probability' : 'Cleared — Normal Behavioral Pattern'}</span>
                </div>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-black text-white font-bold">
                  Risk: {result.pre_confirmation_risk_score}/100
                </span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed font-sans">{result.recommendation}</p>
            </div>
          )}

          {/* Key-Value Block / Tx Info */}
          {activeTab !== 'address' && activeTab !== 'mempool' && activeTab !== 'precheck' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(result).map(([k, v]) => (
                <MinimalStatCard key={k} label={k} value={String(v ?? '—')} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
