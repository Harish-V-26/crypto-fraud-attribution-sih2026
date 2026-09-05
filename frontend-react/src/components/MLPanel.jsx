// src/components/MLPanel.jsx
// Minimalist ML fraud typology classification + pre-confirmation flag widget

import { motion } from 'framer-motion'
import { Brain, Zap, AlertTriangle, CheckCircle2, Activity } from 'lucide-react'

const ANOMALY_CONFIG = {
  'HIGHLY ANOMALOUS': { color: '#f87171', border: 'border-rose-900/50', bg: 'bg-rose-950/20', icon: AlertTriangle },
  'UNUSUAL':          { color: '#fbbf24', border: 'border-amber-900/50', bg: 'bg-amber-950/20', icon: Activity },
  'TYPICAL':          { color: '#34d399', border: 'border-emerald-900/50', bg: 'bg-emerald-950/20', icon: CheckCircle2 },
}

function ConfidenceBar({ label, value, index }) {
  return (
    <motion.div
      className="flex items-center gap-3 mb-2.5"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.3 }}
    >
      <span className="text-xs text-zinc-400 font-sans w-44 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-zinc-300"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: 0.1 * index + 0.2, duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-xs w-12 text-right flex-shrink-0 text-zinc-300 font-medium">
        {value.toFixed(1)}%
      </span>
    </motion.div>
  )
}

function PatternBadge({ pattern }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/60 text-xs font-mono text-zinc-300 mr-2 mb-2">
      <Zap size={11} className="text-zinc-400" />
      {pattern.pattern_name}
      <span className="text-zinc-400 font-mono">(+{pattern.risk_boost})</span>
    </span>
  )
}

function PreConfirmationFlag({ mlData }) {
  if (!mlData?.pre_confirmation_flag) return null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-4 p-3.5 rounded-lg border border-rose-900/60 bg-rose-950/20 flex items-start gap-3"
    >
      <AlertTriangle size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-xs font-semibold text-rose-300 tracking-wide uppercase">
          Pre-Confirmation Interception Flag
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">
          Predicted fraud probability: <span className="font-mono text-rose-300 font-semibold">{(mlData.pre_confirmation_confidence || 0).toFixed(1)}%</span> — 
          Flagged by mempool heuristic model before blockchain block finality.
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-5 font-sans"
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-zinc-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Machine Learning Attribution
          </h3>
        </div>
        <span className="text-[10.5px] font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700/60 px-2 py-0.5 rounded-md">
          {mlData.methodology || 'Bayesian Classifier · Anomaly Scoring'}
        </span>
      </div>

      {/* Pre-confirmation flag */}
      <PreConfirmationFlag mlData={mlData} />

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-zinc-950 border border-zinc-800/90 rounded-lg p-3.5 text-center">
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 mb-1">Top Typology</div>
          <div className="font-semibold text-sm text-zinc-100 leading-snug">
            {mlData.top_fraud_typology || '—'}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/90 rounded-lg p-3.5 text-center">
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 mb-1">Classifier Confidence</div>
          <div className="font-mono font-bold text-xl text-zinc-100">
            {(mlData.typology_confidence || 0).toFixed(1)}%
          </div>
        </div>

        <div className={`rounded-lg p-3.5 text-center border ${anomaly.border} ${anomaly.bg}`}>
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 mb-1">Anomaly Rating</div>
          <div className="font-mono font-bold text-xl" style={{ color: anomaly.color }}>
            {(mlData.anomaly_score || 0).toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <AnomalyIcon size={11} style={{ color: anomaly.color }} />
            <span className="text-[10px] font-mono uppercase" style={{ color: anomaly.color }}>
              {mlData.anomaly_band}
            </span>
          </div>
        </div>
      </div>

      {/* Patterns detected */}
      {mlData.patterns_detected?.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-zinc-400 mb-2">Matched typology patterns:</div>
          <div className="flex flex-wrap">
            {mlData.patterns_detected.map((p, i) => <PatternBadge key={i} pattern={p} />)}
          </div>
        </div>
      )}

      {/* Typology breakdown */}
      {mlData.all_typologies?.length > 0 && (
        <div className="border-t border-zinc-800/80 pt-4">
          <div className="text-xs text-zinc-400 mb-3">Model probability distribution:</div>
          {mlData.all_typologies.slice(0, 6).map((t, i) => (
            <ConfidenceBar
              key={t.typology}
              label={t.typology}
              value={t.confidence}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Recommendation */}
      {mlData.investigative_recommendation && (
        <div className="mt-4 border-t border-zinc-800/80 pt-4 text-xs text-zinc-400 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/60">
          <span className="text-zinc-300 font-medium">Investigative Guidance: </span>
          {mlData.investigative_recommendation}
        </div>
      )}
    </motion.div>
  )
}
