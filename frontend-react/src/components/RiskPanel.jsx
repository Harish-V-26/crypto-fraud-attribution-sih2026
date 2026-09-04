// src/components/RiskPanel.jsx
// Tiered risk score display with animated gauge and entity attribution

import { motion } from 'framer-motion'
import { ShieldAlert, ShieldCheck, AlertTriangle, Building2, Link } from 'lucide-react'

const RISK_CONFIG = {
  LOW:      { color: '#6fd196', bg: '#1e3a2e', border: '#2d5a43', label: 'Low Risk',      icon: ShieldCheck,  score_range: '0–29'  },
  MEDIUM:   { color: '#d99a3f', bg: '#3a3320', border: '#5a4a20', label: 'Medium Risk',   icon: AlertTriangle, score_range: '30–59' },
  HIGH:     { color: '#e08360', bg: '#3a2620', border: '#5a3a20', label: 'High Risk',     icon: ShieldAlert,  score_range: '60–79' },
  CRITICAL: { color: '#f07a6e', bg: '#3a1e1e', border: '#6a2a2a', label: 'Critical Risk', icon: ShieldAlert,  score_range: '80–100'},
}

function RiskGauge({ score, color }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const pct = Math.min(score, 100) / 100
  const dashOffset = circumference * (1 - pct * 0.75) // 270° arc

  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      <svg width="144" height="144" viewBox="0 0 144 144" className="rotate-[135deg]">
        {/* Background track */}
        <circle
          cx="72" cy="72" r={r}
          fill="none"
          stroke="#2a353b"
          strokeWidth="10"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
        />
        {/* Animated fill */}
        <motion.circle
          cx="72" cy="72" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference * 0.75 + circumference * 0.25 }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-mono font-bold text-3xl"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-text-dim font-mono">/100</span>
      </div>
    </div>
  )
}

function RiskIndicators({ reasons }) {
  return (
    <ul className="space-y-2 mt-2">
      {reasons.length === 0 ? (
        <li className="text-sm text-text-dim">No elevated risk indicators detected</li>
      ) : reasons.map((r, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 * i }}
          className="flex items-start gap-2 text-sm text-text-main"
        >
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red flex-shrink-0" />
          {r}
        </motion.li>
      ))}
    </ul>
  )
}

export default function RiskPanel({ riskAssessment, traceResult }) {
  if (!riskAssessment) return null

  const band = riskAssessment.risk_band || 'MEDIUM'
  const cfg = RISK_CONFIG[band] || RISK_CONFIG.MEDIUM
  const Icon = cfg.icon
  const attribution = traceResult?.attribution

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Risk Score Card */}
      <div
        className="rounded-lg p-5 border"
        style={{ background: cfg.bg, borderColor: cfg.border }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Icon size={18} style={{ color: cfg.color }} />
          <h3 className="font-semibold text-sm" style={{ color: cfg.color }}>{cfg.label}</h3>
          <span className="ml-auto font-mono text-xs px-2 py-0.5 rounded-full border" style={{ color: cfg.color, borderColor: cfg.border, background: '#00000030' }}>
            Score {riskAssessment.risk_score}/100
          </span>
        </div>

        <RiskGauge score={riskAssessment.risk_score} color={cfg.color} />

        {/* Tier bars */}
        <div className="mt-4 flex gap-1">
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(tier => (
            <div
              key={tier}
              className="flex-1 h-1.5 rounded-full transition-all duration-500"
              style={{
                background: band === tier ? RISK_CONFIG[tier].color : '#2a353b',
                boxShadow: band === tier ? `0 0 8px ${RISK_CONFIG[tier].color}80` : 'none',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] font-mono text-text-dim mt-1 px-0.5">
          <span>LOW</span><span>MEDIUM</span><span>HIGH</span><span>CRITICAL</span>
        </div>
      </div>

      {/* Attribution Card */}
      <div className="bg-panel border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={15} className="text-amber" />
          <h3 className="font-semibold text-sm text-text-dim">Entity Attribution</h3>
        </div>
        {attribution ? (
          <div>
            <div className="text-2xl font-bold text-accent">{attribution.exchange}</div>
            <div className="font-mono text-xs text-text-dim mt-1">{attribution.type}</div>
            {traceResult?.flags?.hops_to_exchange != null && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-mono px-2 py-1 bg-panel-alt rounded border border-border text-text-dim">
                <Link size={10} />
                Resolved in {traceResult.flags.hops_to_exchange} hop(s)
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="text-amber font-semibold text-sm">No exchange resolved within trace depth</div>
            <div className="text-text-dim text-xs mt-1">
              {traceResult?.flags?.cross_chain_detected
                ? '⚠ Cross-chain bridge detected — funds may have moved to another blockchain.'
                : 'Recommend deeper trace or cross-chain bridge analysis.'}
            </div>
          </div>
        )}
      </div>

      {/* Risk Indicators */}
      <div className="bg-panel border border-border rounded-lg p-5">
        <h3 className="font-semibold text-sm text-text-dim mb-3">Risk Indicators</h3>
        <RiskIndicators reasons={riskAssessment.reasons || []} />
      </div>
    </motion.div>
  )
}
