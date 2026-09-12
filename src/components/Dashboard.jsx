/**
 * Dashboard.jsx — ThermalGuard District Control Panel
 * 
 * Requirements:
 * - No page scroll (strictly 100vh viewport, overflow: hidden)
 * - Top-right Profile option with manager details and Logout
 * - Shows data strictly for the logged-in manager's appointed state & district
 * - Left table: click hotspot -> globe rotates & points at it + arrow mark appears
 * - Clicking glowing spot where arrow pointed shows "Explore More" which opens new page
 */

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, User, LogOut, ChevronDown, Flame, ArrowRight, X, Radio, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHotspotsByDistrict, getAllHotspots } from '../data/hotspotDetails'
import WireframeGlobe from './WireframeGlobe'

function getClassTag(cls) {
  const map = {
    'Acute Industrial Fire':    { color: '#ff3b30', bg: 'rgba(255,59,48,0.12)', border: 'rgba(255,59,48,0.35)' },
    'Routine Gas Flare':        { color: '#f5a623', bg: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.35)' },
    'Persistent Industrial Heat': { color: '#3a9fff', bg: 'rgba(58,159,255,0.12)', border: 'rgba(58,159,255,0.35)' },
    'Wildfire / Natural Fire':   { color: '#ff8c00', bg: 'rgba(255,140,0,0.12)', border: 'rgba(255,140,0,0.35)' },
    'Agricultural Burning':     { color: '#a8c640', bg: 'rgba(168,198,64,0.12)', border: 'rgba(168,198,64,0.35)' },
    'Uncertain / Other':        { color: '#aaaaaa', bg: 'rgba(170,170,170,0.10)', border: 'rgba(170,170,170,0.25)' },
  }
  return map[cls] || { color: '#f5a623', bg: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.35)' }
}

export default function Dashboard() {
  const { manager, logout } = useAuth()
  const navigate = useNavigate()

  // Fallback to Jamnagar if previewed without login
  const currentDistrict = manager?.district || 'Jamnagar'
  const currentState    = manager?.state || 'Gujarat'

  // District-filtered hotspots
  const districtHotspots = useMemo(() => {
    const list = getHotspotsByDistrict(currentDistrict)
    return list.length > 0 ? list : getHotspotsByDistrict('Jamnagar')
  }, [currentDistrict])

  // All hotspots for global globe context (primary district + others)
  const allHotspots = useMemo(() => getAllHotspots(), [])

  // Currently selected hotspot — null on load so globe rotates freely until user clicks a hotspot
  const [selectedHotspotId, setSelectedHotspotId] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleSelectHotspot = (spot) => {
    setSelectedHotspotId(spot.id)
  }

  const handleExplore = (spot) => {
    navigate(`/explore/${spot.id}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const selectedSpot = useMemo(() => {
    if (!selectedHotspotId) return null
    return districtHotspots.find(s => s.id === selectedHotspotId) || null
  }, [districtHotspots, selectedHotspotId])

  const criticalCount = districtHotspots.filter(s => (s.satellite?.frp ?? s.frp) >= 100).length
  const warningCount  = districtHotspots.filter(s => {
    const v = s.satellite?.frp ?? s.frp
    return v >= 50 && v < 100
  }).length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: '#000308',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-body)',
      overflow: 'hidden', height: '100vh', width: '100vw',
      userSelect: 'none',
    }}>
      {/* ── Top Navigation Bar ── */}
      <div style={{
        flexShrink: 0, height: 58, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(2, 6, 16, 0.95)',
        backdropFilter: 'blur(16px)',
        zIndex: 50,
      }}>
        {/* Left: Brand + District Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #55d4f5, #3a6fff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 0 16px rgba(85,212,245,0.3)',
          }}>
            <Shield size={17} color="#030c18" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                {currentDistrict}
              </span>
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 4,
                background: 'rgba(85,212,245,0.1)', border: '1px solid rgba(85,212,245,0.25)',
                color: '#55d4f5', fontFamily: 'var(--font-mono)', fontWeight: 600,
              }}>
                {currentState}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                Control Panel
              </span>
            </div>
          </div>
        </div>

        {/* Center: Pipeline stages tracker */}
        <div className="hidden xl:flex items-center gap-2">
          {['DETECT','CLUSTER','ENRICH','ASSESS','REVIEW','LEARN'].map((s, i) => (
            <span key={s} style={{
              fontSize: 9.5, fontWeight: 700, fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 6,
              background: i <= 3 ? 'rgba(85,212,245,0.08)' : 'rgba(255,255,255,0.03)',
              color: i <= 3 ? '#55d4f5' : 'rgba(255,255,255,0.22)',
              border: `1px solid ${i <= 3 ? 'rgba(85,212,245,0.2)' : 'rgba(255,255,255,0.04)'}`,
            }}>{s}</span>
          ))}
        </div>

        {/* Right: Profile Menu + Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live Sync Pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.25)',
          }}>
            <Radio size={12} color="#34c759" className="animate-pulse" />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#34c759', fontFamily: 'var(--font-mono)' }}>
              VIIRS NRT LIVE
            </span>
          </div>

          {/* Profile Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '6px 12px', borderRadius: 10,
                background: profileOpen ? 'rgba(85,212,245,0.15)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 13,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, #3a6fff, #55d4f5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={14} color="#030c18" strokeWidth={2.5} />
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                  {manager ? manager.name : 'Officer In-Charge'}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                  {manager ? manager.role : 'District Manager'}
                </div>
              </div>
              <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {/* Profile Dropdown Modal */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    width: 290, zIndex: 100,
                    background: 'rgba(4, 9, 22, 0.97)',
                    border: '1px solid rgba(85,212,245,0.25)',
                    borderRadius: 14, padding: 18,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 30px rgba(85,212,245,0.1)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3a6fff, #55d4f5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <User size={20} color="#030c18" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                        {manager ? manager.name : 'Arun Patel'}
                      </div>
                      <div style={{ fontSize: 11, color: '#55d4f5', fontFamily: 'var(--font-mono)' }}>
                        {manager ? manager.role : 'District Thermal Officer'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>Jurisdiction:</span>
                      <strong style={{ color: '#fff' }}>{currentDistrict}, {currentState}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>Official Email:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#fff' }}>
                        {manager ? manager.email : 'manager.jamnagar@thermalguard.in'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>Access Level:</span>
                      <span style={{ color: '#34c759', fontWeight: 600 }}>Level-3 Command</span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', padding: '9px 14px', borderRadius: 9,
                      background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.28)',
                      color: '#ff3b30', fontSize: 12.5, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 8,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Close button -> home */}
          <button
            onClick={() => navigate('/')}
            title="Return to Home"
            style={{
              width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Main Dashboard Workspace (Strictly No-Scroll Outer Viewport) ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* ── Left Sidebar: Hotspot Table & Triage Queue ── */}
        <div style={{
          width: 'clamp(340px, 26vw, 410px)',
          flexShrink: 0,
          background: 'rgba(2, 6, 14, 0.95)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column',
          zIndex: 20,
          overflow: 'hidden',
        }}>
          {/* Header Summary Cards */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Active Hotspots
              </span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
                fontFamily: 'var(--font-mono)',
              }}>
                {districtHotspots.length} detected
              </span>
            </div>

            {/* Micro stat pills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Critical (≥100)</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#ff3b30', fontFamily: 'var(--font-mono)' }}>
                  {criticalCount}
                </span>
              </div>
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Warning (≥50)</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#ff8c00', fontFamily: 'var(--font-mono)' }}>
                  {warningCount}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Hotspot List (Internal Scroll only) */}
          <div className="custom-scrollbar" style={{
            flex: 1, overflowY: 'auto', padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {districtHotspots.map((spot) => {
              const isSel = spot.id === selectedHotspotId
              const frpVal = spot.satellite?.frp ?? spot.frp ?? 0
              const tag = getClassTag(spot.class)

              return (
                <div
                  key={spot.id}
                  onClick={() => handleSelectHotspot(spot)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: isSel ? 'rgba(85,212,245,0.10)' : 'rgba(255,255,255,0.025)',
                    border: isSel ? '1px solid rgba(85,212,245,0.45)' : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: isSel ? '0 0 20px rgba(85,212,245,0.12)' : 'none',
                    transition: 'all 0.16s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: tag.color, boxShadow: `0 0 8px ${tag.color}`,
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {spot.id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: tag.color, fontFamily: 'var(--font-mono)' }}>
                        {frpVal.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>MW</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 4,
                      background: tag.bg, color: tag.color, border: `1px solid ${tag.border}`,
                      fontWeight: 600,
                    }}>
                      {spot.class}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                      {spot.lat.toFixed(2)}°, {spot.lng.toFixed(2)}°
                    </span>
                  </div>

                  {spot.facility?.name && (
                    <div style={{
                      fontSize: 10.5, color: 'rgba(255,255,255,0.5)', marginTop: 6,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      📍 {spot.facility.name}
                    </div>
                  )}

                  {/* Direct Explore CTA button on row */}
                  {isSel && (
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExplore(spot) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 6,
                          background: 'linear-gradient(135deg, #55d4f5, #3a6fff)',
                          border: 'none', color: '#040d18',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Explore More <ArrowRight size={11} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Intensity Legend Card at bottom of Left Panel */}
          <div style={{
            padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,3,10,0.8)',
          }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600 }}>
              Heat Intensity Threshold
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3b30' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>≥100 MW Critical</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff8c00' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>≥50 MW Warning</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f5a623' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>≥10 MW Moderate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34c759' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>&lt;10 MW Background</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Center & Right: 3D D3 Halftone Wireframe Globe Viewport ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000000' }}>
          <WireframeGlobe
            hotspots={allHotspots}
            selectedHotspotId={selectedHotspotId}
            onSelectHotspot={handleSelectHotspot}
            onExplore={handleExplore}
          />

          {/* Selected Hotspot HUD Badge (Top Left of Globe) */}
          {selectedSpot && (
            <motion.div
              key={selectedSpot.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                position: 'absolute', top: 20, left: 24, zIndex: 25,
                background: 'rgba(3, 8, 20, 0.88)',
                border: '1px solid rgba(85,212,245,0.25)',
                borderRadius: 12, padding: '12px 18px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(12px)',
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#55d4f5', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  TARGET POINTED
                </span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#55d4f5' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  {selectedSpot.id}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                {selectedSpot.facility?.name || selectedSpot.class}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>
                Coords: {selectedSpot.lat.toFixed(4)}°N, {selectedSpot.lng.toFixed(4)}°E
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
