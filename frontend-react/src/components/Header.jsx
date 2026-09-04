// src/components/Header.jsx
import { useState, useEffect } from 'react'
import { ShieldAlert, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { checkHealth } from '../lib/api'

export default function Header() {
  const [status, setStatus] = useState('checking') // 'checking' | 'live' | 'offline'
  const [version, setVersion] = useState('2.0')

  useEffect(() => {
    checkHealth()
      .then(d => { setStatus('live'); setVersion(d.version || '2.0') })
      .catch(() => setStatus('offline'))
  }, [])

  const statusConfig = {
    checking: { icon: <Loader2 size={13} className="animate-spin" />, label: 'Checking backend…', cls: 'text-text-dim border-border' },
    live:     { icon: <Wifi size={13} />, label: `Backend live — v${version}`, cls: 'text-accent border-accent-soft' },
    offline:  { icon: <WifiOff size={13} />, label: 'Backend offline — Demo mode', cls: 'text-amber border-amber/30' },
  }
  const s = statusConfig[status]

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-panel sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={28} className="text-accent" />
        </div>
        <div>
          <div className="font-semibold text-[17px] text-text-main">Crypto Fraud Attribution System</div>
          <div className="text-xs text-text-dim mt-0.5 font-mono">
            SIH 2026 &middot; National Cyber Fraud Coordination &middot; v2.0 React Build
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-2 font-mono text-[12.5px] px-3 py-1.5 rounded border ${s.cls}`}>
        {s.icon}
        <span>{s.label}</span>
        {status === 'live' && (
          <span className="w-2 h-2 rounded-full bg-accent live-dot ml-1" />
        )}
      </div>
    </header>
  )
}
