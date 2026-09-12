/**
 * HeroSection.jsx
 * 
 * Structure:
 * - 300vh scrollable section
 * - Globe canvas is sticky (stays fixed while scrolling)
 * - On scroll: camera zooms into surface (handled in EarthGlobe ScrollZoom)
 * - Hero copy fades out as user scrolls
 * - SpaceEdu-style description text fades in at bottom when zoomed in
 */

import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Thermometer, Wind, Zap, Globe2 } from 'lucide-react'
import GlobeCanvas from './Globe/GlobeCanvas'
import Navbar from './Navbar'
import ScrollIndicator from './ScrollIndicator'

// ── Motion variants ────────────────────────────────────────────────────────
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.6 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22,1,0.36,1] } },
}
const maskUp = {
  hidden: { y: '112%' },
  show:   { y: '0%',  transition: { duration: 0.95, ease: [0.16,1,0.3,1] } },
}
const ruleDraw = {
  hidden: { scaleX: 0, originX: 0 },
  show:   { scaleX: 1, transition: { duration: 0.65, ease: [0.16,1,0.3,1] } },
}

// ── Stat chips ────────────────────────────────────────────────────────────
const STATS = [
  { icon: Thermometer, label: 'Surface Anomaly',  value: '+1.2',  unit: '°C',     color: '#f5a623' },
  { icon: Zap,         label: 'Active Hotspots',  value: '2,847', unit: 'zones',   color: '#ff5a5a' },
  { icon: Wind,        label: 'Wind Deviation',   value: '34',    unit: 'km/h',    color: '#55d4f5' },
  { icon: Globe2,      label: 'Global Coverage',  value: '98.4',  unit: '% land',  color: '#6fe38d' },
]

function StatChip({ icon: Icon, label, value, unit, color }) {
  return (
    <motion.div variants={fadeUp} style={{
      padding: 'clamp(11px,1.1vw,16px)',
      background: 'rgba(0,8,20,0.70)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      border: `1px solid ${color}22`, borderRadius: 16, minWidth: 196,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 12, flexShrink: 0,
        background: `${color}14`, border: `1px solid ${color}2e`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.36)', fontFamily: 'var(--font-logo)', fontWeight: 600 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
          <span style={{ fontSize: 21, fontWeight: 700, color, fontFamily: 'var(--font-logo)', lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', fontWeight: 500 }}>{unit}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────
export default function HeroSection({ targetLocation }) {
  const containerRef = useRef(null)

  // Scroll-based animations for hero text fade-out
  const { scrollY } = useScroll()
  // Hero copy fades out between 0 → 600px scroll
  const copyOpacity = useTransform(scrollY, [0, 600], [1, 0])
  const copyY       = useTransform(scrollY, [0, 600], [0, -40])
  // Description text fades IN between 600 → 1000px scroll
  const descOpacity = useTransform(scrollY, [600, 1000], [0, 1])
  const descY       = useTransform(scrollY, [600, 1000], [30, 0])

  return (
    /*
     * The outer div is 300vh tall — this is what enables scroll-to-zoom.
     * The inner .sticky div stays fixed in the viewport while the outer scrolls.
     */
    <div ref={containerRef} style={{ position: 'relative', height: '300vh' }}>
      {/* ── Sticky viewport container ── */}
      <div style={{
        position: 'sticky', top: 0,
        height: '100vh', width: '100%',
        overflow: 'hidden',
      }}>
        {/* Navbar */}
        <Navbar />

        {/* Globe — full viewport */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <GlobeCanvas targetLocation={targetLocation} />
        </div>

        {/* Gradient overlays — left darkens for readability */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '55%',
            background: 'linear-gradient(to right, rgba(0,8,20,0.80) 0%, rgba(0,8,20,0.48) 60%, transparent 100%)',
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '20%',
            background: 'linear-gradient(to bottom, rgba(0,5,14,0.65) 0%, transparent 100%)',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
            background: 'linear-gradient(to top, rgba(0,5,14,0.80) 0%, transparent 100%)',
          }} />
        </div>

        {/* ── Hero copy — fades out on scroll ── */}
        <motion.div
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            zIndex: 10, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: 'clamp(90px,9vw,120px) clamp(24px,5vw,80px) 80px',
            opacity: copyOpacity, y: copyY,
          }}
        >
          <motion.div
            className="flex flex-col items-start"
            style={{ maxWidth: 'clamp(300px,40vw,560px)', pointerEvents: 'auto' }}
            variants={stagger} initial="hidden" animate="show"
          >
            {/* Eyebrow */}
            <motion.div variants={fadeUp}>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.9em',
                fontSize: 'clamp(10px,0.95vw,12px)', fontWeight: 600,
                letterSpacing: '0.26em', textTransform: 'uppercase',
                color: '#55d4f5', fontFamily: 'var(--font-body)',
              }}>
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: '#55d4f5', boxShadow: '0 0 8px #55d4f5',
                  animation: 'pulse-slow 2s ease-in-out infinite',
                }} />
                Thermal Intelligence Platform
              </span>
            </motion.div>

            {/* H1 mask reveal */}
            <div style={{ overflow: 'hidden', paddingBottom: 4, marginBottom: '0.06em' }}>
              <motion.h1 variants={maskUp} style={{
                fontFamily: 'var(--font-serif)', fontWeight: 400,
                fontSize: 'clamp(44px,6.5vw,100px)', lineHeight: 1.0,
                color: '#ffffff', letterSpacing: '-0.015em',
              }}>Thermal</motion.h1>
            </div>
            <div style={{ overflow: 'hidden', marginBottom: '0.65em' }}>
              <motion.h1 variants={maskUp} style={{
                fontFamily: 'var(--font-serif)', fontWeight: 400,
                fontSize: 'clamp(44px,6.5vw,100px)', lineHeight: 1.0,
                letterSpacing: '-0.015em',
                background: 'linear-gradient(135deg, #55d4f5 0%, #79dce8 45%, #e0f8ff 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>Guard</motion.h1>
            </div>

            {/* Rule */}
            <motion.div variants={ruleDraw} style={{
              height: 3, width: 88, borderRadius: 3,
              marginBottom: '1.5em', marginTop: '0.12em',
              background: 'linear-gradient(90deg, #55d4f5 0%, #3a6fff 100%)',
            }} />

            {/* Lede */}
            <motion.p variants={fadeUp} style={{
              fontFamily: 'var(--font-body)', fontWeight: 400,
              fontSize: 'clamp(14px,1.2vw,17px)', lineHeight: 1.78,
              color: 'rgba(255,255,255,0.70)', maxWidth: '42ch', marginBottom: '2.6em',
            }}>
              Real‑time thermal anomaly intelligence for a changing planet.
              Monitor surface temperatures, urban heat islands, and wildfire
              hotspots across an interactive 3D Earth.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#map" className="btn-primary rounded-full" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 'clamp(13px,1.1vw,15px)', fontWeight: 700,
                padding: 'clamp(13px,1.3vw,17px) clamp(26px,2.5vw,34px)',
                letterSpacing: '0.04em', textDecoration: 'none',
              }}>
                Explore the Map <ArrowRight size={15} />
              </a>
              <a href="#data" className="btn-outline rounded-full" style={{
                fontSize: 'clamp(13px,1.1vw,15px)', fontWeight: 600,
                padding: 'clamp(12px,1.2vw,16px) clamp(24px,2.3vw,30px)',
                letterSpacing: '0.04em', textDecoration: 'none',
              }}>
                Live Data
              </a>
            </motion.div>
          </motion.div>

          {/* HUD Stats — right side */}
          <motion.div
            variants={stagger} initial="hidden" animate="show"
            style={{
              position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
              display: 'none', flexDirection: 'column', gap: 10,
              padding: '0 clamp(20px,4vw,64px)', pointerEvents: 'auto',
            }}
            className="lg:flex"
          >
            {STATS.map(s => <StatChip key={s.label} {...s} />)}
          </motion.div>
        </motion.div>

        {/*
          ── SpaceEdu-style description text ──
          Fades in as user scrolls and zooms into the surface.
          Matches the reference image exactly.
        */}
        <motion.div
          style={{
            position: 'absolute', bottom: 60, left: '50%',
            transform: 'translateX(-50%)', zIndex: 20,
            textAlign: 'center', maxWidth: 480,
            pointerEvents: 'none',
            opacity: descOpacity, y: descY,
          }}
        >
          {/* Cyan accent line */}
          <div style={{
            width: 48, height: 2, borderRadius: 2, margin: '0 auto 20px',
            background: 'linear-gradient(90deg, transparent, #55d4f5, transparent)',
          }} />
          <p style={{
            fontFamily: 'var(--font-body)', fontWeight: 400,
            fontSize: 'clamp(13px,1.1vw,15px)', lineHeight: 1.78,
            color: 'rgba(255,255,255,0.75)',
          }}>
            Our home planet Earth is a rocky, terrestrial planet. It has a solid
            and active surface with mountains, valleys, canyons, plains and so
            much more. Earth is special because it is an ocean planet. Water
            covers 70% of Earth's surface.
          </p>
        </motion.div>

        {/* Scroll indicator — only shows before scroll starts */}
        <ScrollIndicator />

        {/* HUD coords */}
        <div style={{
          position: 'absolute', bottom: 24, left: 24, zIndex: 15,
          fontFamily: 'var(--font-logo)', fontSize: 10,
          letterSpacing: '0.12em', color: 'rgba(85,212,245,0.28)',
          pointerEvents: 'none',
        }}>28.6139°N · 77.2090°E</div>
        <div style={{
          position: 'absolute', bottom: 24, right: 24, zIndex: 15,
          fontFamily: 'var(--font-logo)', fontSize: 10,
          letterSpacing: '0.12em', color: 'rgba(85,212,245,0.28)',
          pointerEvents: 'none',
        }}>ALT · 408 km · LEO</div>
      </div>
    </div>
  )
}
