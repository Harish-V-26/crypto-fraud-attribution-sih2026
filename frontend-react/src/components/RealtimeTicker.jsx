// src/components/RealtimeTicker.jsx
// White background & Black text real-time market ticker & gas telemetry strip

import { useState, useEffect } from 'react'
import { Globe, Layers } from 'lucide-react'
import { connectRealtimeWebSocket, fetchMarketPrices, fetchGasPrices, fetchBlockchainStatus } from '../lib/api'

export default function RealtimeTicker() {
  const [marketData, setMarketData] = useState(null)
  const [gasData, setGasData] = useState(null)
  const [blockStatus, setBlockStatus] = useState(null)
  const [wsStatus, setWsStatus] = useState('connecting')
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
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
        console.warn('Initial ticker error:', err)
      }
    }
    initFetch()

    const socket = connectRealtimeWebSocket(
      (payload) => {
        if (payload.market?.assets) setMarketData(payload.market)
        if (payload.gas?.ethereum) setGasData(payload.gas)
        if (payload.blockchain?.networks) setBlockStatus(payload.blockchain)
      },
      (status) => setWsStatus(status)
    )

    const interval = setInterval(() => {
      initFetch()
    }, 15000)

    return () => {
      socket.close()
      clearInterval(interval)
    }
  }, [])

  const assets = marketData?.assets ? Object.values(marketData.assets) : [
    { symbol: 'BTC', price_usd: 79620, price_inr: 6911016, change_24h: -1.65 },
    { symbol: 'ETH', price_usd: 2452, price_inr: 212833, change_24h: -2.25 },
    { symbol: 'SOL', price_usd: 102.1, price_inr: 8862, change_24h: -1.70 },
    { symbol: 'BNB', price_usd: 722.5, price_inr: 62713, change_24h: -0.25 },
    { symbol: 'USDT', price_usd: 1.0, price_inr: 86.8, change_24h: 0.01 },
  ]

  const ethGas = gasData?.ethereum?.standard || gasData?.ethereum?.slow || 14
  const btcFee = gasData?.bitcoin?.fastest || gasData?.bitcoin?.half_hour || 18
  const ethBlock = blockStatus?.networks?.ethereum?.block_height || 20854320

  return (
    <div className="w-full bg-zinc-50 border-b border-zinc-200 text-[11px] font-mono text-zinc-600 px-4 sm:px-6 py-2 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6">
        
        {/* Left: Stream Indicator & Currency Switch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-700">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-black shadow-[0_0_4px_rgba(0,0,0,0.5)]'
                  : wsStatus === 'connecting'
                  ? 'bg-zinc-400 animate-pulse'
                  : 'bg-zinc-300'
              }`}
            />
            <span className="text-[10px] tracking-wider uppercase font-semibold text-black">
              {wsStatus === 'connected' ? 'LIVE' : 'SYNC'}
            </span>
          </div>

          <button
            onClick={() => setCurrency(c => (c === 'USD' ? 'INR' : 'USD'))}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-zinc-300 bg-white text-black hover:bg-zinc-100 transition-colors shadow-xs font-semibold"
            title="Toggle USD / INR Currency"
          >
            <Globe size={10} className="text-zinc-500" />
            <span>{currency}</span>
          </button>
        </div>

        {/* Center: Live Tickers */}
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar py-0.5">
          {assets.map((coin) => {
            const isPos = (coin.change_24h || 0) >= 0
            const priceStr =
              currency === 'INR'
                ? `₹${(coin.price_inr || coin.price_usd * 86.8).toLocaleString('en-IN', { maximumFractionDigits: coin.price_inr < 100 ? 2 : 0 })}`
                : `$${(coin.price_usd || 0).toLocaleString('en-US', { minimumFractionDigits: coin.price_usd < 10 ? 2 : 0, maximumFractionDigits: 2 })}`

            return (
              <div key={coin.symbol} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-zinc-500 font-semibold">{coin.symbol}</span>
                <span className="text-black font-bold">{priceStr}</span>
                <span className="text-[9.5px] font-mono text-zinc-600">
                  {isPos ? '+' : ''}{coin.change_24h}%
                </span>
              </div>
            )
          })}
        </div>

        {/* Right: Minimalist Gas & Blocks */}
        <div className="flex items-center gap-3 text-zinc-600">
          <div className="flex items-center gap-1.5" title={gasData?.ethereum?.source || 'Infura Gas Oracle v3'}>
            <span>ETH Gas</span>
            <span className="text-black font-semibold">{ethGas} Gwei</span>
            <span className="text-[9.5px] bg-zinc-200 text-black px-1 py-0.5 rounded font-mono font-semibold">Infura v3</span>
          </div>

          <span className="text-zinc-300">·</span>

          <div className="flex items-center gap-1.5">
            <span>BTC Fee</span>
            <span className="text-black font-semibold">{btcFee} sat/vB</span>
          </div>

          <span className="hidden lg:inline text-zinc-300">·</span>

          <div className="hidden lg:flex items-center gap-1.5">
            <Layers size={11} className="text-zinc-400" />
            <span className="text-black font-medium">#{ethBlock}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
