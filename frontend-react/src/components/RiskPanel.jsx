// src/components/RiskPanel.jsx
// Black & White tiered risk score display with clean circular meter and entity attribution

import { motion } from 'framer-motion'
import { ShieldAlert, ShieldCheck, AlertTriangle, Building2, Link, CheckCircle2 } from 'lucide-react'

const RISK_CONFIG = {
  LOW:      { color: '#71717a', barColor: '#52525b', badgeCls: 'badge-low',      label: 'Low Risk',      icon: ShieldCheck,  score_range: '0–29'  },
  MEDIUM:   { color: '#a1a1aa', barColor: '#71717a', badgeCls: 'badge-medium',   label: 'Medium Risk',   icon: AlertTriangle, score_range: '30–59' },
  HIGH:     { color: '#e4e4e7', barColor: '#d4d4d8', badgeCls: 'badge-high',     label: 'High Risk',     icon: ShieldAlert,  score_range: '60–79' },
  CRITICAL: { color: '#ffffff', barColor: '#ffffff', badgeCls: 'badge-critical', label: 'Critical Risk', icon: ShieldAlert,  score_range: '80–100'},
}

function RiskGauge({ score }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const pct = Math.min(score, 100) / 100
  const dashOffset = circumference * (1 - pct * 0.75) // 270° arc

  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto my-2">
      <svg width="144" height="144" viewBox="0 0 144 144" className="rotate-[135deg]">
        {/* Background track */}
        <circle
          cx="72" cy="72" r={r}
          fill="none"
          stroke="#27272a"
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
        />
        {/* Animated fill - pure white */}
        <motion.circle
          cx="72" cy="72" r={r}
          fill="none"
          stroke="#ffffff"
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference * 0.75 + circumference * 0.25 }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-mono font-bold text-3xl text-white"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">/ 100 max</span>
      </div>
    </div>
  )
}

function RiskIndicators({ reasons }) {
  return (
    <ul className="space-y-2 mt-3">
      {reasons.length === 0 ? (
        <li className="text-xs text-zinc-400 font-mono">No elevated risk indicators detected for this address.</li>
      ) : reasons.map((r, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 * i }}
          className="flex items-start gap-2.5 text-xs text-zinc-300 font-sans leading-relaxed"
        >
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
          <span>{r}</span>
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 font-sans"
    >
      {/* Risk Score Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-2">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-white" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Risk Evaluation · {cfg.label}
            </h3>
          </div>
          <span className={`${cfg.badgeCls} font-mono font-medium text-xs px-2.5 py-0.5 rounded-md`}>
            {band} · {riskAssessment.risk_score}/100
          </span>
        </div>

        <RiskGauge score={riskAssessment.risk_score} />

        {/* Tier progress bars */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80">
          <div className="flex gap-1.5">
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(tier => (
              <div
                key={tier}
                className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{
                  background: band === tier ? '#ffffff' : '#27272a',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-1.5 px-0.5 uppercase tracking-wider">
            <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
          </div>
        </div>
      </div>

      {/* Attribution Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800/80">
          <Building2 size={15} className="text-zinc-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Entity Attribution</h3>
        </div>
        {attribution ? (
          <div>
            <div className="text-xl font-bold text-white tracking-tight">{attribution.exchange}</div>
            <div className="font-mono text-xs text-zinc-400 mt-1 capitalize">{attribution.type}</div>
            {traceResult?.flags?.hops_to_exchange != null && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 bg-zinc-900 rounded-md border border-zinc-700 text-zinc-300">
                <Link size={11} className="text-zinc-400" />
                Resolved in {traceResult.flags.hops_to_exchange} transaction hop(s)
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="text-zinc-200 font-medium text-xs">No centralized exchange off-ramp identified within trace depth.</div>
            <div className="text-zinc-400 text-xs mt-1">
              {traceResult?.flags?.cross_chain_detected
                ? 'Cross-chain bridge detected — assets bridged to an external blockchain ledger.'
                : 'Consider increasing search depth or examining multi-signature contracts.'}
            </div>
          </div>
        )}
      </div>

      {/* Risk Indicators */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 pb-2 border-b border-zinc-800/80">
          Identified Risk Indicators
        </h3>
        <RiskIndicators reasons={riskAssessment.reasons || []} />
      </div>
    </motion.div>
  )
}
