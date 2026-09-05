// src/components/RealtimeTicker.jsx
// Real-time crypto market ticker, live gas gauge, and blockchain pulse

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Flame, TrendingUp, TrendingDown, RefreshCw, Zap, Globe, Layers } from 'lucide-react'
import { connectRealtimeWebSocket, fetchMarketPrices, fetchGasPrices, fetchBlockchainStatus } from '../lib/api'

export default function RealtimeTicker() {
  const [marketData, setMarketData] = useState(null)
  const [gasData, setGasData] = useState(null)
  const [blockStatus, setBlockStatus] = useState(null)
  const [wsStatus, setWsStatus] = useState('connecting') // 'connected' | 'connecting' | 'disconnected' | 'error'
  const [currency, setCurrency] = useState('USD') // 'USD' | 'INR'
  const [lastUpdated, setLastUpdated] = useState(Date.now())

  // Initial fetch and WebSocket subscription
  useEffect(() => {
    // 1. Initial REST fetch for instant display
    async function initFetch() {
      try {
        const [market, gas, blocks] = await Promise.allSettled([
          fetchMarketPrices(),
          fetchGasPrices(),
          fetchBlockchainStatus(),
        ])
        if (market.status === 'fulfilled') setMarketData(market.value)
        if (gas.status === 'fulfilled') setGasData(gas.value)
        if (blocks.status === 'fulfilled') setBlockStatus(blocks.value)
      } catch (err) {
        console.warn('Initial ticker fetch error:', err)
      }
    }
    initFetch()

    // 2. Connect WebSocket stream
    const socket = connectRealtimeWebSocket(
      (payload) => {
        if (payload.market && payload.market.assets) {
          setMarketData(payload.market)
        }
        if (payload.gas && payload.gas.ethereum) {
          setGasData(payload.gas)
        }
        if (payload.blockchain && payload.blockchain.networks) {
          setBlockStatus(payload.blockchain)
        }
        setLastUpdated(Date.now())
      },
      (status) => {
        setWsStatus(status)
      }
    )

    // Periodic fallback poll every 8s if WebSocket is disconnected
    const interval = setInterval(() => {
      if (wsStatus !== 'connected') {
        initFetch()
      }
    }, 8000)

    return () => {
      socket.close()
      clearInterval(interval)
    }
  }, [wsStatus])

  const assets = marketData?.assets ? Object.values(marketData.assets) : [
    { symbol: 'BTC', name: 'Bitcoin', price_usd: 68450, price_inr: 5941460, change_24h: 2.45 },
    { symbol: 'ETH', name: 'Ethereum', price_usd: 3520, price_inr: 305536, change_24h: 1.82 },
    { symbol: 'SOL', name: 'Solana', price_usd: 152.4, price_inr: 13228.3, change_24h: 4.15 },
    { symbol: 'BNB', name: 'BNB', price_usd: 595.0, price_inr: 51646, change_24h: -0.45 },
    { symbol: 'USDT', name: 'Tether', price_usd: 1.0, price_inr: 86.8, change_24h: 0.01 },
  ]

  const ethGas = gasData?.ethereum?.standard || gasData?.ethereum?.slow || 16
  const btcFee = gasData?.bitcoin?.fastest || gasData?.bitcoin?.half_hour || 18
  const ethBlock = blockStatus?.networks?.ethereum?.block_height || 20854320
  const btcBlock = blockStatus?.networks?.bitcoin?.block_height || 862410

  return (
    <div className="w-full bg-[#080d14]/90 backdrop-blur border-b border-border/80 text-xs font-mono text-text-dim px-4 py-2 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
        
        {/* Left: Live Status Badge & Currency Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-panel-alt border border-border">
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-text-main">
              {wsStatus === 'connected' ? 'LIVE STREAM' : wsStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE SYNC'}
            </span>
          </div>

          {/* USD / INR toggle */}
          <button
            onClick={() => setCurrency(c => (c === 'USD' ? 'INR' : 'USD'))}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-panel hover:bg-panel-alt border border-border text-accent transition-colors"
            title="Toggle USD / INR Currency display"
          >
            <Globe size={11} />
            <span>{currency}</span>
          </button>
        </div>

        {/* Center: Live Crypto Asset Prices */}
        <div className="flex items-center gap-4 overflow-x-auto py-0.5 no-scrollbar">
          {assets.map((coin) => {
            const isPos = (coin.change_24h || 0) >= 0
            const priceStr =
              currency === 'INR'
                ? `₹${(coin.price_inr || coin.price_usd * 86.8).toLocaleString('en-IN', { maximumFractionDigits: coin.price_inr < 100 ? 2 : 0 })}`
                : `$${(coin.price_usd || 0).toLocaleString('en-US', { minimumFractionDigits: coin.price_usd < 10 ? 2 : 0, maximumFractionDigits: 2 })}`

            return (
              <div key={coin.symbol} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-bold text-text-main">{coin.symbol}</span>
                <span className="text-white font-medium">{priceStr}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-semibold flex items-center ${
                    isPos ? 'text-emerald-400 bg-emerald-950/40' : 'text-rose-400 bg-rose-950/40'
                  }`}
                >
                  {isPos ? '+' : ''}{coin.change_24h}%
                </span>
              </div>
            )
          })}
        </div>

        {/* Right: Real-time Gas & Live Block Heights */}
        <div className="flex items-center gap-3">
          {/* Ethereum Gas */}
          <div className="flex items-center gap-1.5 text-[11px] bg-panel-alt px-2 py-0.5 rounded border border-border" title="Ethereum Live Gas Fee">
            <Flame size={12} className="text-purple-400" />
            <span className="text-text-dim">ETH Gas:</span>
            <span className="text-purple-300 font-semibold">{ethGas} Gwei</span>
          </div>

          {/* Bitcoin Sats/vB */}
          <div className="flex items-center gap-1.5 text-[11px] bg-panel-alt px-2 py-0.5 rounded border border-border" title="Bitcoin Recommended Fast Fee">
            <Zap size={12} className="text-amber-400" />
            <span className="text-text-dim">BTC Fee:</span>
            <span className="text-amber-300 font-semibold">{btcFee} sat/vB</span>
          </div>

          {/* Live Blocks */}
          <div className="hidden lg:flex items-center gap-2 text-[10.5px] text-text-dim border-l border-border/80 pl-3">
            <Layers size={11} className="text-cyan-400" />
            <span>ETH #{ethBlock}</span>
            <span className="text-border">|</span>
            <span>BTC #{btcBlock}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
