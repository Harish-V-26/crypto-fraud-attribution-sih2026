// src/components/CrossChainPanel.jsx
import { motion } from 'framer-motion'
import { GitBranch, Cpu } from 'lucide-react'

export default function CrossChainPanel({ data }) {
  if (!data) return null
  if (data.bridge_events_detected === 0 && data.defi_events_detected === 0) return null

  const riskColors = { HIGH: '#e08360', MEDIUM: '#d99a3f', LOW: '#6fd196', CRITICAL: '#f07a6e' }
  const riskColor = riskColors[data.cross_chain_risk] || '#d99a3f'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-panel border border-border rounded-lg p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <GitBranch size={15} className="text-orange" />
        <h3 className="font-semibold text-sm text-text-dim">Cross-Chain Bridge & DeFi Analysis</h3>
      </div>

      {/* Summary banner */}
      <div
        className="mb-4 px-3 py-2.5 rounded-lg border text-sm font-semibold"
        style={{ background: riskColor + '15', borderColor: riskColor + '50', color: riskColor }}
      >
        ⚠ {data.cross_chain_risk} CROSS-CHAIN RISK — {data.summary}
      </div>

      {/* Bridge hops */}
      {data.bridge_hops?.map((b, i) => (
        <div key={i} className="mb-3 p-4 bg-panel-alt rounded-lg border border-amber/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber font-semibold text-sm">🌉 {b.bridge_name}</span>
          </div>
          <div className="font-mono text-xs text-text-dim mb-2 break-all">{b.bridge_contract}</div>
          <div className="text-xs text-text-dim">{b.analyst_note}</div>
          {b.destination_correlations?.map((c, j) => (
            <div key={j} className="mt-2 p-2.5 bg-panel rounded border border-border text-xs font-mono">
              <span className="text-accent">{c.destination_chain.toUpperCase()}</span>
              <span className="text-text-dim"> estimated address: </span>
              <span className="text-text-main break-all">{c.estimated_destination_address}</span>
            </div>
          ))}
        </div>
      ))}

      {/* DeFi hops */}
      {data.defi_hops?.map((d, i) => (
        <div key={i} className="mb-3 p-4 bg-panel-alt rounded-lg border border-purple/20">
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={13} className="text-purple" />
            <span className="text-purple font-semibold text-sm">{d.protocol}</span>
            <span className="text-xs text-text-dim">[{d.category}]</span>
          </div>
          <div className="font-mono text-xs text-text-dim mb-1 break-all">{d.contract_address}</div>
          <div className="text-xs text-text-dim">{d.analyst_note}</div>
        </div>
      ))}
    </motion.div>
  )
}
