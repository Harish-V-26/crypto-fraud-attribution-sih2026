// src/components/MLPanel.jsx
// ML fraud typology classification + pre-confirmation flag widget

import { motion } from 'framer-motion'
import { Brain, Zap, AlertTriangle, CheckCircle2, Activity } from 'lucide-react'

const TYPOLOGY_COLORS = ['#4fb3a9', '#d99a3f', '#c85a4f', '#8899ff', '#ff8844', '#6fd196']

const ANOMALY_CONFIG = {
  'HIGHLY ANOMALOUS': { color: '#f07a6e', bg: '#3a1e1e', icon: AlertTriangle },
  'UNUSUAL':          { color: '#d99a3f', bg: '#3a3320', icon: Activity },
  'TYPICAL':          { color: '#6fd196', bg: '#1e3a2e', icon: CheckCircle2 },
}

function ConfidenceBar({ label, value, color, index }) {
  return (
    <motion.div
      className="flex items-center gap-3 mb-2"
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
    >
      <span className="text-[11.5px] text-text-dim font-sans w-44 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-panel-alt rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: 0.15 * index + 0.3, duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-[11px] w-10 text-right flex-shrink-0" style={{ color }}>
        {value.toFixed(1)}%
      </span>
    </motion.div>
  )
}

function PatternBadge({ pattern }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red/10 border border-red/30 text-[11.5px] font-mono text-red mr-2 mb-2">
      <Zap size={10} />
      {pattern.pattern_name}
      <span className="text-text-dim ml-1">(+{pattern.risk_boost})</span>
    </span>
  )
}

function PreConfirmationFlag({ mlData }) {
  if (!mlData?.pre_confirmation_flag) return null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-4 p-3 rounded-lg border border-red/50 bg-red/10 flex items-start gap-3"
    >
      <AlertTriangle size={16} className="text-red mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-sm font-semibold text-red">
          Pre-Confirmation ML Flag
        </div>
        <div className="text-xs text-text-dim mt-0.5">
          Fraud probability: <span className="font-mono text-red">{(mlData.pre_confirmation_confidence || 0).toFixed(1)}%</span> — 
          Would be flagged by on-chain ML contract before ledger confirmation.
        </div>
      </div>
    </motion.div>
  )
}

export default function MLPanel({ mlData }) {
  if (!mlData) return null

  const anomaly = ANOMALY_CONFIG[mlData.anomaly_band] || ANOMALY_CONFIG['TYPICAL']
  const AnomalyIcon = anomaly.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-panel border border-border rounded-lg p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain size={16} className="text-purple" />
        <h3 className="font-semibold text-sm text-text-dim">AI / ML Analysis</h3>
        <span className="ml-auto text-[10.5px] font-mono text-text-dim border border-border px-2 py-0.5 rounded">
          {mlData.methodology || 'Bayesian · rule-based · anomaly scoring'}
        </span>
      </div>

      {/* Pre-confirmation flag */}
      <PreConfirmationFlag mlData={mlData} />

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-panel-alt rounded-lg p-3 text-center border border-border">
          <div className="font-semibold text-[13px] text-accent leading-snug">
            {mlData.top_fraud_typology || '—'}
          </div>
          <div className="text-[11px] text-text-dim mt-1">Fraud Typology</div>
        </div>
        <div className="bg-panel-alt rounded-lg p-3 text-center border border-border">
          <div className="font-mono font-bold text-xl text-purple">
            {(mlData.typology_confidence || 0).toFixed(1)}%
          </div>
          <div className="text-[11px] text-text-dim mt-1">Classifier Confidence</div>
        </div>
        <div
          className="rounded-lg p-3 text-center border"
          style={{ background: anomaly.bg, borderColor: anomaly.color + '50' }}
        >
          <div className="font-mono font-bold text-xl" style={{ color: anomaly.color }}>
            {(mlData.anomaly_score || 0).toFixed(1)}
          </div>
          <div className="text-[11px] text-text-dim mt-0.5">Anomaly Score</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <AnomalyIcon size={10} style={{ color: anomaly.color }} />
            <span className="text-[9.5px] font-mono" style={{ color: anomaly.color }}>
              {mlData.anomaly_band}
            </span>
          </div>
        </div>
      </div>

      {/* Patterns detected */}
      {mlData.patterns_detected?.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-text-dim mb-2">Fraud patterns matched:</div>
          {mlData.patterns_detected.map((p, i) => <PatternBadge key={i} pattern={p} />)}
        </div>
      )}

      {/* Typology breakdown */}
      {mlData.all_typologies?.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="text-xs text-text-dim mb-3">All typology probabilities:</div>
          {mlData.all_typologies.slice(0, 6).map((t, i) => (
            <ConfidenceBar
              key={t.typology}
              label={t.typology}
              value={t.confidence}
              color={TYPOLOGY_COLORS[i % TYPOLOGY_COLORS.length]}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Recommendation */}
      {mlData.investigative_recommendation && (
        <div className="mt-4 border-t border-border pt-4 text-xs text-text-dim leading-relaxed">
          <span className="text-text-dim font-semibold text-[11px]">Investigative Recommendation: </span>
          {mlData.investigative_recommendation}
        </div>
      )}
    </motion.div>
  )
}
