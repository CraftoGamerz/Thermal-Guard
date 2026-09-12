/**
 * Navbar.jsx — Always transparent. Control Panel login button replaces SearchFilter.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Shield, Lock } from 'lucide-react'
import ControlPanelLogin from './ControlPanelLogin'

const NAV_LINKS = [
  { label: 'Map',      href: '#map'      },
  { label: 'Data',     href: '#data'     },
  { label: 'Alerts',   href: '#alerts'   },
  { label: 'Research', href: '#research' },
]

export default function Navbar() {
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setMenuOpen(false); setShowLogin(false) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50" style={{ pointerEvents: 'auto' }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          padding: '0 clamp(20px,3.5vw,52px)',
          height: 'clamp(58px,6vw,76px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <a href="#" style={{
            fontFamily: 'var(--font-body)', fontWeight: 800,
            fontSize: 'clamp(14px,1.4vw,18px)', color: '#fff',
            textDecoration: 'none', letterSpacing: '-0.02em',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #55d4f5, #3a6fff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Shield size={16} color="#04101f" strokeWidth={2.5} />
            </div>
            Thermal<span style={{ color: '#55d4f5' }}>Guard</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center" style={{ gap: 'clamp(6px,2.5vw,32px)' }}>
            {NAV_LINKS.map(link => (
              <a key={link.label} href={link.href} style={{
                fontFamily: 'var(--font-body)', fontWeight: 500,
                fontSize: 'clamp(13px,1.1vw,14px)', color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none', padding: '5px 6px', letterSpacing: '-0.01em',
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => { e.target.style.color = '#fff' }}
                onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.7)' }}
              >{link.label}</a>
            ))}

            {/* Control Panel Button */}
            <button
              onClick={() => setShowLogin(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 10, cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(85,212,245,0.12), rgba(58,111,255,0.12))',
                border: '1px solid rgba(85,212,245,0.28)',
                color: '#55d4f5', fontFamily: 'var(--font-body)',
                fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(85,212,245,0.2), rgba(58,111,255,0.2))'; e.currentTarget.style.borderColor = 'rgba(85,212,245,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(85,212,245,0.12), rgba(58,111,255,0.12))'; e.currentTarget.style.borderColor = 'rgba(85,212,245,0.28)' }}
            >
              <Lock size={12} strokeWidth={2.5}/>
              Control Panel
            </button>

            {/* Live pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 20,
              background: 'rgba(85,212,245,0.06)', border: '1px solid rgba(85,212,245,0.18)',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: '#55d4f5',
                boxShadow: '0 0 6px #55d4f5', display: 'inline-block',
                animation: 'pulse-slow 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#55d4f5',
                letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>LIVE</span>
            </div>
          </nav>

          {/* Mobile burger */}
          <button className="md:hidden" style={{
            width: 38, height: 38, borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              style={{
                padding: '16px 24px 20px',
                background: 'rgba(2,4,12,0.97)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              {NAV_LINKS.map(link => (
                <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} style={{
                  fontFamily: 'var(--font-body)', fontWeight: 500,
                  fontSize: 15, color: 'rgba(255,255,255,0.8)',
                  textDecoration: 'none', padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>{link.label}</a>
              ))}
              <button
                onClick={() => { setMenuOpen(false); setShowLogin(true) }}
                style={{
                  marginTop: 12, padding: '12px 20px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #55d4f5, #3a6fff)',
                  border: 'none', color: '#03090f',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Lock size={14}/> Control Panel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && <ControlPanelLogin onClose={() => setShowLogin(false)} />}
      </AnimatePresence>
    </>
  )
}
