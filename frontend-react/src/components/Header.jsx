// src/components/Header.jsx
import { useState, useEffect } from 'react'
import { ShieldCheck, Loader2, ArrowUpRight } from 'lucide-react'
import { checkHealth } from '../lib/api'

export default function Header() {
  const [status, setStatus] = useState('checking')
  const [version, setVersion] = useState('2.0')

  useEffect(() => {
    checkHealth()
      .then(d => { setStatus('live'); setVersion(d.version || '2.0') })
      .catch(() => setStatus('offline'))
  }, [])

  return (
    <header className="border-b border-border/70 bg-bg/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-panel-alt border border-border flex items-center justify-center text-text-main shadow-minimal">
            <ShieldCheck size={18} className="text-zinc-200" />
          </div>
          <div>
            <div className="font-medium text-sm text-text-main tracking-tight flex items-center gap-2">
              Crypto Fraud Attribution
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                SIH 2026
              </span>
            </div>
            <div className="text-[11px] text-text-muted font-mono tracking-tight">
              National Cyber Fraud Coordination Platform
            </div>
          </div>
        </div>

        {/* Right Status Pill & 3D Link */}
        <div className="flex items-center gap-3">
          <a
            href={`http://${window.location.hostname}:8000/3d_view.html`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-text-dim hover:text-text-main font-mono px-2.5 py-1 rounded-md hover:bg-panel transition-colors"
          >
            <span>3D Vector Space</span>
            <ArrowUpRight size={13} />
          </a>

          <div className="flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-full bg-panel border border-border/80 text-text-dim">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'live'
                  ? 'bg-emerald-400 live-dot'
                  : status === 'checking'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="text-[11px] text-zinc-300">
              {status === 'live' ? `Engine v${version}` : status === 'checking' ? 'Syncing...' : 'Offline'}
            </span>
          </div>
        </div>

      </div>
    </header>
  )
}
