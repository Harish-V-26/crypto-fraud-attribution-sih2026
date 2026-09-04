// src/App.jsx
// Root application — orchestrates all panels and state

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchReport } from './lib/api'

import Header         from './components/Header'
import IntakeForm     from './components/IntakeForm'
import NetworkGraph   from './components/NetworkGraph'
import RiskPanel      from './components/RiskPanel'
import MLPanel        from './components/MLPanel'
import CrossChainPanel from './components/CrossChainPanel'
import FreezeNotice   from './components/FreezeNotice'
import LiveMonitor    from './components/LiveMonitor'
import Dashboard      from './components/Dashboard'

// Tab config for results section
const RESULT_TABS = [
  { id: 'graph',   label: '🔗 Fund Flow Graph' },
  { id: 'risk',    label: '🛡 Risk & Attribution' },
  { id: 'ml',      label: '🧠 ML Analysis' },
  { id: 'freeze',  label: '🔒 Freeze Notice' },
]

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-lg font-semibold">{children}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

export default function App() {
  const [caseData, setCaseData]       = useState(null)
  const [report, setReport]           = useState(null)
  const [demoMode, setDemoMode]       = useState(false)
  const [activeTab, setActiveTab]     = useState('graph')
  const [selectedNode, setSelectedNode] = useState(null)
  const [dashRefresh, setDashRefresh] = useState(0)

  const handleResult = useCallback(async (data) => {
    setCaseData(data)
    setActiveTab('graph')
    setSelectedNode(null)

    // Try to fetch full report
    try {
      const r = await fetchReport(data.case_id)
      setReport(r)
    } catch {
      setReport(null)
    }

    setDashRefresh(k => k + 1)

    // Smooth scroll to results
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 200)
  }, [])

  function handleNodeClick(node) {
    setSelectedNode(node)
    setActiveTab('risk')
  }

  const graphData = caseData?.trace_result?.graph

  return (
    <div className="min-h-screen bg-bg text-text-main font-sans">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── Intake Form ─────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Report a Suspect Wallet</SectionTitle>
          <IntakeForm onResult={handleResult} onDemoMode={() => setDemoMode(true)} />
          {demoMode && (
            <div className="mt-3 text-xs font-mono text-amber flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber live-dot" />
              Demo mode — backend offline. Showing illustrative data.
            </div>
          )}
        </section>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {caseData && (
            <motion.section
              id="results-section"
              key="results"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Case header */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <h2 className="text-lg font-semibold">
                  Case <span className="font-mono text-accent">{caseData.case_id}</span>
                </h2>
                <div className="flex-1 h-px bg-border" />
                {/* Risk badge */}
                {caseData.risk_assessment && (() => {
                  const band = caseData.risk_assessment.risk_band
                  const cls = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', CRITICAL: 'badge-critical' }[band] || 'badge-medium'
                  return (
                    <span className={`${cls} font-mono font-semibold text-xs px-3 py-1 rounded-full`}>
                      {band} · {caseData.risk_assessment.risk_score}/100
                    </span>
                  )
                })()}
                <span className="text-xs font-mono text-text-dim border border-border px-2 py-1 rounded">
                  {(caseData.chain || 'eth').toUpperCase()}
                </span>
                <span className="text-xs font-mono text-text-dim border border-border px-2 py-1 rounded">
                  {caseData.complaint_category}
                </span>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 bg-panel-alt border border-border rounded-lg p-1 mb-5 overflow-x-auto">
                {RESULT_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-max py-2 px-3 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-accent text-bg'
                        : 'text-text-dim hover:text-text-main'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'graph' && (
                  <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="bg-panel border border-border rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-text-dim">Fund-Flow Trace</h3>
                        <span className="text-[10.5px] font-mono text-text-dim border border-border px-2 py-0.5 rounded">
                          {caseData.trace_result?.data_source === 'live' ? '[live blockchain data]' : '[simulated data]'}
                        </span>
                      </div>
                      <NetworkGraph graphData={graphData} onNodeClick={handleNodeClick} />
                      <p className="text-xs text-text-dim mt-3">
                        💡 Click any node to inspect it. Shapes: ⬤ circle = wallet/exchange, ◆ diamond = mixer, ★ star = bridge, ▲ triangle = DeFi.
                      </p>
                    </div>

                    {/* Cross-chain below graph */}
                    <div className="mt-4">
                      <CrossChainPanel data={caseData.cross_chain_analysis} />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'risk' && (
                  <motion.div key="risk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <RiskPanel
                      riskAssessment={caseData.risk_assessment}
                      traceResult={caseData.trace_result}
                    />
                    {selectedNode && (
                      <div className="mt-4 bg-panel border border-accent/30 rounded-lg p-4 text-sm">
                        <div className="text-accent font-semibold mb-1">Selected Node: {selectedNode.label}</div>
                        <div className="font-mono text-xs text-text-dim break-all">{selectedNode.id}</div>
                        <div className="mt-1 text-xs text-text-dim capitalize">Type: {selectedNode.type}</div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'ml' && (
                  <motion.div key="ml" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <MLPanel mlData={caseData.ml_analysis} />
                  </motion.div>
                )}

                {activeTab === 'freeze' && (
                  <motion.div key="freeze" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <FreezeNotice caseData={caseData} />

                    {/* JSON Report */}
                    {report && (
                      <div className="mt-4 bg-panel border border-border rounded-lg p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-text-dim">Investigation Report (JSON)</h3>
                          <button
                            onClick={() => {
                              const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url; a.download = `${report.report_id}.json`; a.click()
                            }}
                            className="text-xs font-mono text-accent border border-accent/30 px-3 py-1 rounded hover:bg-accent/10 transition-colors"
                          >
                            ⬇ Download JSON
                          </button>
                        </div>
                        <pre className="bg-panel-alt text-[11px] font-mono text-text-main p-4 rounded border border-border overflow-auto max-h-64 whitespace-pre-wrap">
                          {JSON.stringify(report, null, 2)}
                        </pre>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Live Monitor ────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Live Ethereum Monitor (Infura)</SectionTitle>
          <LiveMonitor />
        </section>

        {/* ── Dashboard ───────────────────────────────────────────────── */}
        <section>
          <Dashboard refreshKey={dashRefresh} />
        </section>

      </main>

      {/* Footer */}
      <footer className="text-center text-[11.5px] text-text-dim py-10 px-6 border-t border-border max-w-3xl mx-auto">
        SIH 2026 — Real-Time Crypto Fraud Attribution System v2.0 &middot;
        React + Vite + Ethers.js + Infura &middot;
        Cross-chain bridge detection (Wormhole, LayerZero, Hop, Stargate) &middot;
        DeFi protocol detection (Uniswap, Aave, Compound, 1inch) &middot;
        AI/ML Bayesian fraud typology classifier with anomaly scoring &middot;
        NCRP/SAHYOG simulated integration
      </footer>
    </div>
  )
}
