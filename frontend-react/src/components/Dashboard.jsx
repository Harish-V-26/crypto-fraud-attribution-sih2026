// src/components/Dashboard.jsx
// Black & White investigator stats dashboard with monochrome Chart.js

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Tooltip, Legend, Title,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { BarChart3, AlertCircle, GitMerge, Boxes, ShieldAlert, ArrowUpRight } from 'lucide-react'
import { fetchDashboardStats, MOCK_STATS } from '../lib/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { 
    legend: { labels: { color: '#a1a1aa', font: { family: 'JetBrains Mono', size: 10 } } },
    tooltip: {
      backgroundColor: '#000000',
      titleColor: '#ffffff',
      bodyColor: '#a1a1aa',
      borderColor: '#3f3f46',
      borderWidth: 1,
      padding: 8,
      cornerRadius: 6,
    }
  },
  scales: {
    x: { 
      ticks: { color: '#a1a1aa', font: { family: 'JetBrains Mono', size: 10 } }, 
      grid: { color: '#27272a', drawBorder: false } 
    },
    y: { 
      ticks: { color: '#a1a1aa', font: { family: 'JetBrains Mono', size: 10 } }, 
      grid: { color: '#27272a', drawBorder: false }, 
      beginAtZero: true 
    },
  },
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-center flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-center gap-1 text-[10.5px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
          {Icon && <Icon size={12} className="text-zinc-400" />}
          <span>{label}</span>
        </div>
        <div className="font-mono font-bold text-2xl text-white mt-1">
          {value}
        </div>
      </div>
      {sub && <div className="text-[10px] text-zinc-400 mt-1.5 font-mono">{sub}</div>}
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
    <div className="text-center text-zinc-400 text-xs py-10 font-mono">Loading dashboard metrics…</div>
  )

  // Pure Black & White Monochrome Grayscale Palette
  const riskColors = ['#52525b', '#71717a', '#d4d4d8', '#ffffff']
  const exchangeColors = ['#ffffff', '#e4e4e7', '#a1a1aa', '#71717a', '#3f3f46']
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
      borderWidth: 1,
      borderColor: '#000000',
    }],
  }

  const typologyChartData = {
    labels: Object.keys(stats.typology_distribution || { 'No data': 0 }),
    datasets: [{
      data: Object.values(stats.typology_distribution || { 'No data': 0 }),
      backgroundColor: '#71717a',
      hoverBackgroundColor: '#ffffff',
      borderRadius: 4,
      borderSkipped: false,
    }],
  }

  const bridgeChartData = {
    labels: ['Cross-chain detected', 'Single-chain only'],
    datasets: [{
      data: [stats.bridge_detected_count || 0, (stats.total_cases || 0) - (stats.bridge_detected_count || 0)],
      backgroundColor: ['#ffffff', '#27272a'],
      borderWidth: 1,
      borderColor: '#000000',
    }],
  }

  const noScales = { 
    plugins: { 
      legend: { labels: { color: '#a1a1aa', font: { family: 'JetBrains Mono', size: 10 } } },
      tooltip: CHART_DEFAULTS.plugins.tooltip,
    } 
  }

  return (
    <div className="space-y-4 font-sans">
      {useMock && (
        <div className="text-[11px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-md inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Offline fallback — displaying illustrative metrics
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Cases Traced"  value={stats.total_cases}             icon={Boxes} />
        <StatCard label="Mixer Hits"    value={stats.mixer_touched_count}     icon={GitMerge} />
        <StatCard label="Critical"      value={stats.risk_distribution?.CRITICAL || 0} icon={ShieldAlert} />
        <StatCard label="Cross-Chain"   value={stats.bridge_detected_count || 0} />
        <StatCard label="Top Typology"  value={topTyp ? topTyp[0] : '—'}
          sub={topTyp ? `${topTyp[1]} incident(s)` : undefined} />
        <StatCard label="Top Off-Ramp"  value={topEx  ? topEx[0]  : '—'}
          sub={topEx  ? `${topEx[1]} incident(s)`  : undefined} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-3">
            Cases by Risk Band
          </div>
          <Bar
            data={riskChartData}
            options={{
              ...CHART_DEFAULTS,
              plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
            }}
          />
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-3">
            Exchange Attributions
          </div>
          <Doughnut
            data={exchangeChartData}
            options={noScales}
          />
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-3">
            Typology Distribution
          </div>
          <Bar
            data={typologyChartData}
            options={{
              ...CHART_DEFAULTS,
              plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
            }}
          />
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-3">
            Cross-Chain Bridge Activity
          </div>
          <Doughnut
            data={bridgeChartData}
            options={noScales}
          />
        </div>
      </div>
    </div>
  )
}
