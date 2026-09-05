// src/App.jsx
// Root application — White background & Black text design

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchReport } from './lib/api'

import Header         from './components/Header'
import RealtimeTicker from './components/RealtimeTicker'
import IntakeForm     from './components/IntakeForm'
import NetworkGraph   from './components/NetworkGraph'
import RiskPanel      from './components/RiskPanel'
import MLPanel        from './components/MLPanel'
import CrossChainPanel from './components/CrossChainPanel'
import FreezeNotice   from './components/FreezeNotice'
import LiveMonitor    from './components/LiveMonitor'
import LiveInteractionsPanel from './components/LiveInteractionsPanel'
import Dashboard      from './components/Dashboard'

// Tab config for results section
const RESULT_TABS = [
  { id: 'graph',   label: 'Fund Flow Graph' },
  { id: 'risk',    label: 'Risk & Attribution' },
  { id: 'ml',      label: 'ML Analysis' },
  { id: 'freeze',  label: 'Freeze Notice' },
]

function SectionTitle({ title, subtitle }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-3 mb-5 border-b border-zinc-200">
      <div>
        <h2 className="text-sm font-bold tracking-tight text-black uppercase letter-spacing-wide">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-zinc-600 mt-0.5 font-medium">{subtitle}</p>
        )}
      </div>
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
    <div className="min-h-screen bg-white text-black font-sans selection:bg-zinc-200 selection:text-black antialiased">
      <Header />
      <RealtimeTicker />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* ── Intake Form ─────────────────────────────────────────────── */}
        <section>
          <SectionTitle 
            title="Suspect Wallet Investigation" 
            subtitle="Initiate automated real-time blockchain tracing and entity attribution"
          />
          <IntakeForm onResult={handleResult} onDemoMode={() => setDemoMode(true)} />
          {demoMode && (
            <div className="mt-3 text-xs font-mono text-black flex items-center gap-2 bg-zinc-100 border border-zinc-300 px-3 py-2 rounded-md font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-black live-dot" />
              Demo mode active — backend offline. Displaying illustrative trace data.
            </div>
          )}
        </section>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {caseData && (
            <motion.section
              id="results-section"
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Case header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 p-4 rounded-lg shadow-2xs">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-500 uppercase font-semibold">Case Reference</span>
                  <span className="font-mono text-sm font-bold text-black bg-white px-2.5 py-1 rounded border border-zinc-300 shadow-2xs">
                    {caseData.case_id}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Risk badge */}
                  {caseData.risk_assessment && (() => {
                    const band = caseData.risk_assessment.risk_band
                    const cls = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', CRITICAL: 'badge-critical' }[band] || 'badge-medium'
                    return (
                      <span className={`${cls} font-mono font-bold text-xs px-2.5 py-1 rounded-md`}>
                        {band} · {caseData.risk_assessment.risk_score}/100
                      </span>
                    )
                  })()}
                  <span className="text-xs font-mono text-black bg-white border border-zinc-300 px-2 py-1 rounded-md font-semibold">
                    {(caseData.chain || 'eth').toUpperCase()}
                  </span>
                  <span className="text-xs font-sans text-black bg-white border border-zinc-300 px-2.5 py-1 rounded-md font-medium">
                    {caseData.complaint_category}
                  </span>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 bg-zinc-100 border border-zinc-200 rounded-lg p-1 overflow-x-auto">
                {RESULT_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-max py-2 px-3 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-black text-white shadow-xs'
                        : 'text-zinc-600 hover:text-black hover:bg-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'graph' && (
                  <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-black" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-black">Transaction Graph</h3>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-700 bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded font-medium">
                          {caseData.trace_result?.data_source === 'live' ? 'Live on-chain RPC' : 'Simulation'}
                        </span>
                      </div>
                      
                      <NetworkGraph graphData={graphData} onNodeClick={handleNodeClick} />
                      
                      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-zinc-200 text-xs text-zinc-600">
                        <span>Click any node to focus attribution metrics.</span>
                        <a
                          href={`http://${window.location.hostname}:8000/3d_view.html?case_id=${caseData.case_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-zinc-100 border border-zinc-300 text-black hover:bg-zinc-200 transition-all shadow-2xs"
                        >
                          Open 3D Visualizer ↗
                        </a>
                      </div>
                    </div>

                    {/* Cross-chain below graph */}
                    <div className="mt-4">
                      <CrossChainPanel data={caseData.cross_chain_analysis} />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'risk' && (
                  <motion.div key="risk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <RiskPanel
                      riskAssessment={caseData.risk_assessment}
                      traceResult={caseData.trace_result}
                    />
                    {selectedNode && (
                      <div className="mt-4 bg-zinc-50 border border-zinc-300 rounded-lg p-4 text-xs font-mono shadow-2xs">
                        <div className="text-black font-bold mb-1">Selected: {selectedNode.label}</div>
                        <div className="text-zinc-600 break-all">{selectedNode.id}</div>
                        <div className="mt-1 text-zinc-500 capitalize">Type: {selectedNode.type}</div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'ml' && (
                  <motion.div key="ml" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <MLPanel mlData={caseData.ml_analysis} />
                  </motion.div>
                )}

                {activeTab === 'freeze' && (
                  <motion.div key="freeze" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <FreezeNotice caseData={caseData} />

                    {/* JSON Report */}
                    {report && (
                      <div className="mt-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-black">Investigation Report (JSON)</h3>
                          <button
                            onClick={() => {
                              const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url; a.download = `${report.report_id}.json`; a.click()
                            }}
                            className="text-xs font-mono font-semibold text-black bg-zinc-100 border border-zinc-300 px-3 py-1 rounded-md hover:bg-zinc-200 transition-colors shadow-2xs"
                          >
                            Download JSON
                          </button>
                        </div>
                        <pre className="bg-zinc-50 text-[11px] font-mono text-black p-4 rounded-md border border-zinc-200 overflow-auto max-h-64 whitespace-pre-wrap">
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
          <SectionTitle 
            title="Blockchain & Mempool Telemetry" 
            subtitle="Real-time block production, gas parameters, and pending on-chain transaction stream"
          />
          <LiveMonitor />
        </section>

        {/* ── Dashboard ───────────────────────────────────────────────── */}
        <section>
          <SectionTitle 
            title="Investigation Analytics" 
            subtitle="Aggregate case resolution metrics, typology patterns, and off-ramp attributions"
          />
          <Dashboard refreshKey={dashRefresh} />
        </section>

        {/* ── Live API & Pipeline Interactions ──────────────────────────── */}
        <section>
          <SectionTitle 
            title="API & Pipeline Interaction Stream" 
            subtitle="Real-time telemetry of incoming requests, latency benchmarks, and forensic pipeline execution"
          />
          <LiveInteractionsPanel />
        </section>

      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-zinc-500 py-10 px-6 border-t border-zinc-200 max-w-4xl mx-auto space-y-1">
        <div className="font-semibold text-black">SIH 2026 &middot; Cryptocurrency Fraud Attribution & Asset Tracking System</div>
        <div className="text-zinc-600 font-mono text-[10.5px]">
          Live On-Chain RPCs &middot; Ethers.js &middot; Bayesian Typology Classifier &middot; NCRP/SAHYOG Interoperability
        </div>
      </footer>
    </div>
  )
}
