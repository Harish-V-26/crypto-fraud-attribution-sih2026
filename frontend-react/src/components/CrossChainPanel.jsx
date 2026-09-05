// src/components/CrossChainPanel.jsx
// Minimalist Cross-Chain Bridge & DeFi Protocol Analyzer

import { motion } from 'framer-motion'
import { GitBranch, Cpu } from 'lucide-react'

export default function CrossChainPanel({ data }) {
  if (!data) return null
  if (data.bridge_events_detected === 0 && data.defi_events_detected === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-5 font-sans"
    >
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-zinc-800/80">
        <GitBranch size={15} className="text-zinc-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
          Cross-Chain Bridge & DeFi Analysis
        </h3>
      </div>

      {/* Summary banner */}
      <div className="mb-4 px-3.5 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800/50 text-xs text-zinc-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="font-medium text-zinc-200">{data.summary}</span>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded">
          {data.cross_chain_risk} RISK
        </span>
      </div>

      {/* Bridge hops */}
      {data.bridge_hops?.map((b, i) => (
        <div key={i} className="mb-3 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-zinc-100 font-medium text-xs">Bridge: {b.bridge_name}</span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Cross-Chain Hop</span>
          </div>
          <div className="font-mono text-xs text-zinc-400 mb-2 break-all">{b.bridge_contract}</div>
          <div className="text-xs text-zinc-400 leading-relaxed">{b.analyst_note}</div>
          {b.destination_correlations?.map((c, j) => (
            <div key={j} className="mt-2.5 p-2.5 bg-zinc-900/90 rounded border border-zinc-800 text-xs font-mono">
              <span className="text-zinc-200 font-semibold">{c.destination_chain.toUpperCase()}</span>
              <span className="text-zinc-400"> target: </span>
              <span className="text-zinc-300 break-all">{c.estimated_destination_address}</span>
            </div>
          ))}
        </div>
      ))}

      {/* DeFi hops */}
      {data.defi_hops?.map((d, i) => (
        <div key={i} className="mb-3 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Cpu size={13} className="text-zinc-400" />
              <span className="text-zinc-100 font-medium text-xs">{d.protocol}</span>
              <span className="text-[10.5px] text-zinc-400 font-mono">[{d.category}]</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Smart Contract</span>
          </div>
          <div className="font-mono text-xs text-zinc-400 mb-1.5 break-all">{d.contract_address}</div>
          <div className="text-xs text-zinc-400 leading-relaxed">{d.analyst_note}</div>
        </div>
      ))}
    </motion.div>
  )
}
