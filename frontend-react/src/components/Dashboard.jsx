// src/components/Dashboard.jsx
// Investigator stats dashboard with Chart.js charts

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Tooltip, Legend, Title,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { BarChart3, AlertCircle, GitMerge, Boxes } from 'lucide-react'
import { fetchDashboardStats, MOCK_STATS } from '../lib/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

const CHART_DEFAULTS = {
  plugins: { legend: { labels: { color: '#8a999e', font: { family: 'IBM Plex Mono', size: 11 } } } },
  scales: {
    x: { ticks: { color: '#8a999e', font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: '#2a353b' } },
    y: { ticks: { color: '#8a999e', font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: '#2a353b' }, beginAtZero: true },
  },
}

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-panel border border-border rounded-lg p-5 text-center"
    >
      {Icon && <Icon size={18} className="mx-auto mb-2" style={{ color: color || '#4fb3a9' }} />}
      <div className="font-mono font-bold text-3xl" style={{ color: color || '#4fb3a9' }}>
        {value}
      </div>
      <div className="text-xs text-text-dim mt-1">{label}</div>
      {sub && <div className="text-[10px] text-text-dim mt-0.5 font-mono">{sub}</div>}
    </motion.div>
  )
}

export default function Dashboard({ refreshKey }) {
  const [stats, setStats] = useState(null)
  const [useMock, setUseMock] = useState(false)

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => { setStats(MOCK_STATS); setUseMock(true) })
  }, [refreshKey])

  if (!stats) return (
    <div className="text-center text-text-dim text-sm py-10">Loading dashboard…</div>
  )

  const riskColors = ['#6fd196', '#d99a3f', '#e08360', '#f07a6e']
  const exchangeColors = ['#4fb3a9', '#d99a3f', '#c85a4f', '#5c6b70', '#8a999e']
  const topTyp = Object.entries(stats.typology_distribution || {}).sort((a, b) => b[1] - a[1])[0]
  const topEx  = (stats.top_exchanges || [])[0]

  const riskChartData = {
    labels: Object.keys(stats.risk_distribution),
    datasets: [{
      data: Object.values(stats.risk_distribution),
      backgroundColor: riskColors,
      borderRadius: 4,
      borderSkipped: false,
    }],
  }

  const exchangeChartData = {
    labels: stats.top_exchanges?.map(([n]) => n) || ['No data'],
    datasets: [{
      data: stats.top_exchanges?.map(([, v]) => v) || [1],
      backgroundColor: exchangeColors,
      borderWidth: 0,
    }],
  }

  const typologyChartData = {
    labels: Object.keys(stats.typology_distribution || { 'No data': 0 }),
    datasets: [{
      data: Object.values(stats.typology_distribution || { 'No data': 0 }),
      backgroundColor: '#8899ff',
      borderRadius: 4,
      borderSkipped: false,
    }],
  }

  const bridgeChartData = {
    labels: ['Cross-chain detected', 'Single-chain only'],
    datasets: [{
      data: [stats.bridge_detected_count || 0, (stats.total_cases || 0) - (stats.bridge_detected_count || 0)],
      backgroundColor: ['#ff8844', '#2a353b'],
      borderWidth: 0,
    }],
  }

  const noScales = { plugins: { legend: { labels: { color: '#8a999e', font: { family: 'IBM Plex Mono', size: 11 } } } } }

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 size={17} className="text-accent" />
        <h2 className="text-lg font-semibold">Investigator Dashboard</h2>
        {useMock && (
          <span className="text-[10px] font-mono text-amber border border-amber/30 px-2 py-0.5 rounded ml-2">
            Demo data
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        <StatCard label="Cases Traced"      value={stats.total_cases}             icon={Boxes}        color="#4fb3a9" />
        <StatCard label="Mixer-Touched"     value={stats.mixer_touched_count}     icon={GitMerge}     color="#c85a4f" />
        <StatCard label="Critical Risk"     value={stats.risk_distribution?.CRITICAL || 0} icon={AlertCircle} color="#f07a6e" />
        <StatCard label="Cross-Chain"       value={stats.bridge_detected_count || 0}       color="#ff8844" />
        <StatCard label="Top Typology"      value={topTyp ? topTyp[0] : '—'}      color="#8899ff"
          sub={topTyp ? `${topTyp[1]} case(s)` : undefined} />
        <StatCard label="Top Exchange"      value={topEx  ? topEx[0]  : '—'}      color="#d99a3f"
          sub={topEx  ? `${topEx[1]} case(s)`  : undefined} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-panel border border-border rounded-lg p-4">
          <Bar
            data={riskChartData}
            options={{
              ...CHART_DEFAULTS,
              plugins: {
                ...CHART_DEFAULTS.plugins,
                title: { display: true, text: 'Cases by Risk Band', color: '#8a999e', font: { family: 'IBM Plex Mono', size: 12 } },
                legend: { display: false },
              },
            }}
          />
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <Doughnut
            data={exchangeChartData}
            options={{
              ...noScales,
              plugins: {
                ...noScales.plugins,
                title: { display: true, text: 'Exchange Attributions', color: '#8a999e', font: { family: 'IBM Plex Mono', size: 12 } },
              },
            }}
          />
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <Bar
            data={typologyChartData}
            options={{
              ...CHART_DEFAULTS,
              plugins: {
                ...CHART_DEFAULTS.plugins,
                title: { display: true, text: 'AI/ML Fraud Typology Distribution', color: '#8a999e', font: { family: 'IBM Plex Mono', size: 12 } },
                legend: { display: false },
              },
            }}
          />
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <Doughnut
            data={bridgeChartData}
            options={{
              ...noScales,
              plugins: {
                ...noScales.plugins,
                title: { display: true, text: 'Cross-Chain Bridge Activity', color: '#8a999e', font: { family: 'IBM Plex Mono', size: 12 } },
              },
            }}
          />
        </div>
      </div>
    </section>
  )
}
