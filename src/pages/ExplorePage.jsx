/**
 * ExplorePage.jsx — Comprehensive Satellite Data Analytics & AI Comparison
 *
 * Requirements:
 * - Live date & time display (updating each second)
 * - Satellite data comparison (NASA FIRMS VIIRS, ESA WorldCover, ERA5, OSM)
 * - Lookerative graphs, bar charts, telemetry KPI blocks
 * - Mini rotating globe on the left
 * - Smart AI system at bottom that launches the automated assessment modal
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Clock, Satellite, Radio, Flame, Sparkles,
  Building2, Wind, Eye, Compass, Activity, BarChart3,
  Calendar, Layers, Shield, ExternalLink
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'
import { getHotspotById, getAllHotspots } from '../data/hotspotDetails'
import MiniGlobe from '../components/MiniGlobe'
import AIAnalysis from '../components/AIAnalysis'

export default function ExplorePage() {
  const { hotspotId } = useParams()
  const navigate = useNavigate()

  // Find hotspot data or fallback
  const hotspot = useMemo(() => {
    return getHotspotById(hotspotId) || getAllHotspots()[0]
  }, [hotspotId])

  // Live date/time state updating every second
  const [currentTime, setCurrentTime] = useState(new Date())
  const [aiModalOpen, setAiModalOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Format date & time
  const formattedLiveDate = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
    })
  }, [currentTime])

  const formattedLiveTime = useMemo(() => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }) + ' IST'
  }, [currentTime])

  // Prepare chart data
  const frpHistoryData = useMemo(() => {
    if (!hotspot.frpHistory) return []
    return hotspot.frpHistory.map(h => ({
      month: h.month.replace('202', "'2"),
      avg: h.avg,
      min: h.min,
      max: h.max,
    }))
  }, [hotspot])

  const brightnessData = useMemo(() => {
    const i4 = hotspot.satellite?.bright_ti4 ?? 350
    const i5 = hotspot.satellite?.bright_ti5 ?? 295
    return [
      { channel: 'MIR (I4 · 3.9μm)', temp: i4, fill: '#ff4444' },
      { channel: 'TIR (I5 · 11.4μm)', temp: i5, fill: '#3a9fff' },
      { channel: 'Ground Ambient', temp: (hotspot.weather?.temperature_c ?? 28) + 273.15, fill: '#55d4f5' },
    ]
  }, [hotspot])

  const classificationData = useMemo(() => {
    if (!hotspot.classification) return []
    return Object.entries(hotspot.classification).map(([name, prob]) => ({
      name,
      pct: parseFloat((prob * 100).toFixed(1)),
    })).sort((a, b) => b.pct - a.pct)
  }, [hotspot])

  const frpCurrent = hotspot.satellite?.frp ?? hotspot.frp ?? 45
  const medianFrp = hotspot.baseline?.median_frp ?? 35
  const pctDiff = (((frpCurrent - medianFrp) / medianFrp) * 100).toFixed(1)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 0%, #061026 0%, #00040a 60%, #000000 100%)',
      color: '#fff',
      fontFamily: 'var(--font-body)',
      padding: '20px clamp(16px, 4vw, 44px) 60px',
      overflowX: 'hidden',
    }}>
      {/* ── Top Header Bar ── */}
      <div style={{
        maxWidth: 1400, margin: '0 auto 28px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', gap: 16,
        paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Left: Back button + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <ArrowLeft size={15} /> Dashboard
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                {hotspot.id} · Detailed Satellite Comparison
              </h1>
              <span style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 6,
                background: `${hotspot.classColor || '#f5a623'}22`,
                border: `1px solid ${hotspot.classColor || '#f5a623'}44`,
                color: hotspot.classColor || '#f5a623',
                fontWeight: 700,
              }}>
                {hotspot.class}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
              {hotspot.district}, {hotspot.state} · Coordinates: {hotspot.lat.toFixed(4)}°N, {hotspot.lng.toFixed(4)}°E
            </div>
          </div>
        </div>

        {/* Right: Live Date/Time Ticker */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'rgba(5, 12, 28, 0.8)', border: '1px solid rgba(85,212,245,0.22)',
          borderRadius: 12, padding: '10px 18px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(85,212,245,0.1)', border: '1px solid rgba(85,212,245,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={16} color="#55d4f5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#34c759',
                boxShadow: '0 0 8px #34c759',
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#55d4f5', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                DAILY SATELLITE SYNC
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {formattedLiveDate} · {formattedLiveTime}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Section 1: KPI Blocks Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {/* FRP Metric */}
          <div style={{
            padding: 18, borderRadius: 14,
            background: 'rgba(4, 10, 24, 0.75)', border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Fire Radiative Power
              </span>
              <Flame size={15} color={hotspot.classColor || '#f5a623'} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
              {frpCurrent.toFixed(1)} <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>MW</span>
            </div>
            <div style={{ fontSize: 11.5, marginTop: 8, color: frpCurrent >= medianFrp ? '#ff3b30' : '#34c759', fontWeight: 600 }}>
              {frpCurrent >= medianFrp ? `▲ +${pctDiff}%` : `▼ ${pctDiff}%`} vs 12-mo median ({medianFrp.toFixed(1)} MW)
            </div>
          </div>

          {/* Brightness Temp Contrast */}
          <div style={{
            padding: 18, borderRadius: 14,
            background: 'rgba(4, 10, 24, 0.75)', border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Dual-Channel ΔT Contrast
              </span>
              <Activity size={15} color="#55d4f5" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#55d4f5', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
              +{(hotspot.satellite?.delta_t ?? 55).toFixed(1)} <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>K</span>
            </div>
            <div style={{ fontSize: 11.5, marginTop: 8, color: 'rgba(255,255,255,0.6)' }}>
              Channel 4: {hotspot.satellite?.bright_ti4 ?? 360} K · Channel 5: {hotspot.satellite?.bright_ti5 ?? 298} K
            </div>
          </div>

          {/* Satellite Sensor Details */}
          <div style={{
            padding: 18, borderRadius: 14,
            background: 'rgba(4, 10, 24, 0.75)', border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Satellite Instrument
              </span>
              <Satellite size={15} color="#3a9fff" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
              {hotspot.satellite?.sensor || 'VIIRS'} · {hotspot.satellite?.spacecraft || 'NOAA-20'}
            </div>
            <div style={{ fontSize: 11.5, marginTop: 8, color: '#34c759', fontWeight: 600 }}>
              Confidence: {hotspot.satellite?.confidence === 'h' ? 'HIGH (Nominal 375m)' : 'VERIFIED'}
            </div>
          </div>

          {/* Recurrence & Persistence */}
          <div style={{
            padding: 18, borderRadius: 14,
            background: 'rgba(4, 10, 24, 0.75)', border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Annual Persistence
              </span>
              <Radio size={15} color="#c4e357" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
              {((hotspot.baseline?.persistence_rate || 0.88) * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: 11.5, marginTop: 8, color: 'rgba(255,255,255,0.5)' }}>
              Observed {hotspot.baseline?.days_seen_365d || 310} of 365 satellite overpasses
            </div>
          </div>
        </div>

        {/* ── Section 2: Mini Globe + 12-Month FRP Time-Series Chart ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: 20,
        }} className="max-lg:grid-cols-1">
          {/* Mini Rotating Globe Card */}
          <div style={{
            padding: 22, borderRadius: 16,
            background: 'rgba(3, 8, 20, 0.85)', border: '1px solid rgba(85,212,245,0.25)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#55d4f5', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 14 }}>
              Target Pinpoint Orbit
            </div>
            <MiniGlobe lat={hotspot.lat} lng={hotspot.lng} size={180} />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 16 }}>
              {hotspot.facility?.name || `${hotspot.district} Anomaly`}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              Lat {hotspot.lat.toFixed(4)}° · Lng {hotspot.lng.toFixed(4)}°
            </div>
            <div style={{
              fontSize: 10.5, color: '#34c759', padding: '4px 10px', borderRadius: 20,
              background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.25)',
              marginTop: 12, fontWeight: 600,
            }}>
              ● Orthographic 3D Tracking
            </div>
          </div>

          {/* 12-Month FRP Time-Series Graph */}
          <div style={{
            padding: 22, borderRadius: 16,
            background: 'rgba(3, 8, 20, 0.85)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  12-Month Radiative Power (FRP) Time Series
                </span>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                  Historical satellite baseline vs Current acute reading
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ff3b30' }} />
                  Historical FRP
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 2, background: '#55d4f5' }} />
                  Site Median Baseline
                </span>
              </div>
            </div>

            <div style={{ height: 230, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={frpHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="frpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#ff3b30" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} fontFamily="var(--font-mono)" />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} fontFamily="var(--font-mono)" unit=" MW" />
                  <Tooltip
                    contentStyle={{ background: '#050c1e', border: '1px solid rgba(85,212,245,0.3)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#55d4f5', fontWeight: 700 }}
                  />
                  <ReferenceLine y={medianFrp} stroke="#55d4f5" strokeDasharray="4 4" label={{ value: `Median: ${medianFrp} MW`, fill: '#55d4f5', fontSize: 10, position: 'insideTopLeft' }} />
                  <Area type="monotone" dataKey="avg" stroke="#ff3b30" strokeWidth={2.5} fillOpacity={1} fill="url(#frpGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Section 3: Dual-Channel Bar Chart + Land Cover + Classification ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {/* Dual-Channel Temperature Bar Chart */}
          <div style={{
            padding: 20, borderRadius: 16,
            background: 'rgba(3, 8, 20, 0.85)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Radiometric Band Radiance (Kelvin)
            </span>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: 14 }}>
              VIIRS 3.9μm MIR fire emission vs 11.4μm background
            </div>

            <div style={{ height: 180, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brightnessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="channel" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} domain={[250, 'dataMax + 20']} unit=" K" />
                  <Tooltip
                    contentStyle={{ background: '#050c1e', border: '1px solid rgba(85,212,245,0.3)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="temp" radius={[6, 6, 0, 0]}>
                    {brightnessData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ESA WorldCover 10m Land Cover Makeup */}
          <div style={{
            padding: 20, borderRadius: 16,
            background: 'rgba(3, 8, 20, 0.85)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ESA WorldCover 10m Land Fractions
            </span>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: 16 }}>
              Ground cover context inside the 1km anomaly footprint
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'Built-up / Industrial', val: hotspot.landCover?.built_up ?? 48, color: '#ff8c00' },
                { name: 'Cropland (Agricultural)', val: hotspot.landCover?.cropland ?? 12, color: '#c4e357' },
                { name: 'Bare Soil / Slag', val: hotspot.landCover?.bare ?? 24, color: '#aaaaaa' },
                { name: 'Tree Cover / Forest', val: hotspot.landCover?.tree_cover ?? 6, color: '#34c759' },
                { name: 'Water / Wetland', val: (hotspot.landCover?.water ?? 8) + (hotspot.landCover?.wetland ?? 2), color: '#3a9fff' },
              ].map(item => (
                <div key={item.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item.name}</span>
                    <strong style={{ color: item.color, fontFamily: 'var(--font-mono)' }}>{item.val}%</strong>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${item.val}%`, height: '100%', background: item.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6-Class Probabilities */}
          <div style={{
            padding: 20, borderRadius: 16,
            background: 'rgba(3, 8, 20, 0.85)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              6-Class Classifier Consensus
            </span>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, marginBottom: 14 }}>
              XGBoost / Multimodal fusion probabilities
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {classificationData.map(c => (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: c.pct > 50 ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: c.pct > 50 ? 700 : 400 }}>
                      {c.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: c.pct > 50 ? '#55d4f5' : 'rgba(255,255,255,0.4)' }}>
                      {c.pct}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${c.pct}%`, height: '100%',
                      background: c.pct > 50 ? '#55d4f5' : 'rgba(255,255,255,0.2)',
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 4: Smart AI System Bar at Bottom ── */}
        <div style={{
          padding: '24px 32px', borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(85,212,245,0.12) 0%, rgba(58,111,255,0.14) 100%)',
          border: '1px solid rgba(85,212,245,0.38)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 50px rgba(85,212,245,0.18)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: 'linear-gradient(135deg, #55d4f5 0%, #3a6fff 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 0 28px rgba(85,212,245,0.5)',
            }}>
              <Sparkles size={26} color="#030914" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                Automated AI Thermal Intelligence System
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', maxWidth: 640, marginTop: 3 }}>
                Automate multi-spectral comparison across VIIRS 375m, ERA5 weather, and OpenStreetMap industrial infrastructure. Detects peak rises, normal baselines, and local asset exposure.
              </div>
            </div>
          </div>

          <button
            onClick={() => setAiModalOpen(true)}
            style={{
              padding: '14px 28px', borderRadius: 12,
              background: 'linear-gradient(135deg, #55d4f5 0%, #3a6fff 100%)',
              border: 'none', color: '#020a16',
              fontSize: 14, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'var(--font-body)', letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 0 30px rgba(85,212,245,0.45)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 0 40px rgba(85,212,245,0.6)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(85,212,245,0.45)'
            }}
          >
            <Sparkles size={16} /> Run Automated AI Analysis
          </button>
        </div>
      </div>

      {/* ── Smart AI Analysis Modal ── */}
      <AnimatePresence>
        {aiModalOpen && (
          <AIAnalysis hotspot={hotspot} onClose={() => setAiModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
