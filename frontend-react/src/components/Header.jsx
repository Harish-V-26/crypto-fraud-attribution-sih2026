// src/components/Header.jsx
// White background & Black text Header

import { useState, useEffect } from 'react'
import { ShieldCheck, ArrowUpRight } from 'lucide-react'
import { checkHealth } from '../lib/api'

export default function Header() {
  const [status, setStatus] = useState('checking')
  const [version, setVersion] = useState('2.0')

  useEffect(() => {
    let isMounted = true
    const verify = () => {
      checkHealth()
        .then(d => {
          if (isMounted) {
            setStatus('live')
            setVersion(d.version || '2.0')
          }
        })
        .catch(() => {
          if (isMounted) setStatus('offline')
        })
    }

    verify()
    const timer = setInterval(verify, 4000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-300 flex items-center justify-center text-black shadow-minimal">
            <ShieldCheck size={18} className="text-black" />
          </div>
          <div>
            <div className="font-bold text-base text-black tracking-tight flex items-center gap-2 font-mono">
              CRYPTOTRACE
            </div>
            <div className="text-[11px] text-zinc-500 font-mono tracking-tight">
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
            className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-black font-mono px-2.5 py-1 rounded-md hover:bg-zinc-100 transition-colors"
          >
            <span>3D Vector Space</span>
            <ArrowUpRight size={13} />
          </a>

          <div className="flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-300 text-zinc-800">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'live'
                  ? 'bg-black live-dot shadow-[0_0_5px_rgba(0,0,0,0.4)]'
                  : status === 'checking'
                  ? 'bg-zinc-400 animate-pulse'
                  : 'bg-zinc-300'
              }`}
            />
            <span className="text-[11px] text-black font-medium">
              {status === 'live' ? `Engine v${version}` : status === 'checking' ? 'Syncing...' : 'Offline'}
            </span>
          </div>
        </div>

      </div>
    </header>
  )
}
