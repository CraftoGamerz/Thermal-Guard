/**
 * WireframeGlobe.jsx — High-Performance D3 Orthographic Halftone Globe
 *
 * Performance & Behavior:
 * - Starts with smooth continuous auto-rotation containing all red/yellow/green spots
 * - When user selects a hotspot from the table:
 *   Smoothly glides and points at the coordinate using cubic deceleration
 * - Displays a glowing pulsing arrow marker (▼) directly over the selected hotspot
 * - Clicking the glowing spot where the arrow points reveals the "Explore More" popup
 * - Single-path batched dot rendering + GeoJSON caching for 60fps buttery smoothness
 */

import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Flame } from 'lucide-react'
import { getLandData } from '../utils/geoCache'

// ── Hotspot colour config ──────────────────────────────────────────────────────
function hotspotPalette(frp) {
  const v = typeof frp === 'number' ? frp : 20
  if (v >= 100) return { core: '#ff2d2d', mid: 'rgba(255,45,45,0.45)', outer: 'rgba(255,80,30,0.0)', glowSize: 24 }
  if (v >= 50)  return { core: '#ff8c00', mid: 'rgba(255,140,0,0.40)', outer: 'rgba(255,160,0,0.0)', glowSize: 19 }
  if (v >= 10)  return { core: '#f5c842', mid: 'rgba(245,200,66,0.38)', outer: 'rgba(245,200,66,0.0)', glowSize: 15 }
  return               { core: '#34d058', mid: 'rgba(52,208,88,0.35)',  outer: 'rgba(52,208,88,0.0)',  glowSize: 12 }
}

export default function WireframeGlobe({
  hotspots = [],
  selectedHotspotId = null,
  onSelectHotspot = () => {},
  onExplore = () => {},
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [explorePopup, setExplorePopup] = useState(null) // { spot, x, y }

  // Component-level refs so the render loop always reads latest without re-creating effect
  const hotspotsRef    = useRef(hotspots)
  const selectedIdRef  = useRef(selectedHotspotId)
  const onSelectRef    = useRef(onSelectHotspot)
  const onExploreRef   = useRef(onExplore)

  // Smooth rotation animation state ref
  const animRef = useRef(null) // { startTime, duration, startYaw, startPitch, deltaYaw, deltaPitch }

  useEffect(() => { hotspotsRef.current = hotspots }, [hotspots])
  useEffect(() => { onSelectRef.current = onSelectHotspot }, [onSelectHotspot])
  useEffect(() => { onExploreRef.current = onExplore }, [onExplore])

  // Trigger smooth glide to target hotspot ONLY when selectedHotspotId changes and is non-null
  useEffect(() => {
    selectedIdRef.current = selectedHotspotId
    if (selectedHotspotId && hotspotsRef.current) {
      const spot = hotspotsRef.current.find(s => s.id === selectedHotspotId)
      if (spot) {
        // Signal animation start
        animRef.current = {
          targetYaw: -spot.lng,
          targetPitch: Math.max(-80, Math.min(80, -spot.lat)),
          initialized: false,
        }
      }
    } else {
      animRef.current = null
      setExplorePopup(null)
    }
  }, [selectedHotspotId])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    // ── Sizing ─────────────────────────────────────────────────────────────
    const W = container.clientWidth  || 900
    const H = container.clientHeight || 700
    const dpr = Math.min(window.devicePixelRatio || 1, 2) // cap at 2 for performance
    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = `${W}px`
    canvas.style.height = `${H}px`
    context.scale(dpr, dpr)

    const cx = W / 2
    const cy = H / 2
    const baseRadius = Math.min(W, H) * 0.43

    // ── D3 projection ──────────────────────────────────────────────────────
    const projection = d3.geoOrthographic()
      .scale(baseRadius)
      .translate([cx, cy])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)

    // Pre-computed land dots from cache
    let allDots = []
    let landFeatures = null

    // ── Rotation state ─────────────────────────────────────────────────────
    const rotation = [0, -15] // Initial globe orientation
    let rafId = null
    let autoRotate = true
    let resumeTimer = null
    let lastTimestamp = performance.now()
    const ROTATION_SPEED = 16 // degrees per second
    let pulseT = 0

    // ── Draw single hotspot marker ─────────────────────────────────────────
    function drawHotspot(spot, scaleFactor, centerLng, centerLat, t) {
      const angDist = d3.geoDistance([spot.lng, spot.lat], [centerLng, centerLat])
      if (angDist > Math.PI / 2.02) return

      const pt = projection([spot.lng, spot.lat])
      if (!pt) return
      const [px, py] = pt

      const frpValue = spot.satellite?.frp ?? spot.frp ?? 25
      const pal   = hotspotPalette(frpValue)
      const isSel = spot.id === selectedIdRef.current
      const gSize = pal.glowSize * scaleFactor * (isSel ? 1.7 : 1.0)
      const pulse = isSel ? 0.75 + 0.25 * Math.sin(t * 4) : 1

      // Outer glow bloom
      const grd = context.createRadialGradient(px, py, 0, px, py, gSize)
      grd.addColorStop(0,   pal.core)
      grd.addColorStop(0.25, pal.mid)
      grd.addColorStop(1,   pal.outer)
      context.save()
      context.globalAlpha = pulse * 0.95
      context.beginPath()
      context.arc(px, py, gSize, 0, 2 * Math.PI)
      context.fillStyle = grd
      context.fill()
      context.restore()

      // Core bright dot
      const coreR = (frpValue >= 100 ? 4.0 : frpValue >= 50 ? 3.0 : frpValue >= 10 ? 2.4 : 1.9) * scaleFactor
      context.save()
      context.globalAlpha = pulse
      context.beginPath()
      context.arc(px, py, coreR, 0, 2 * Math.PI)
      context.fillStyle = '#ffffff'
      context.fill()
      context.restore()

      // If selected: Glowing radar ring + Arrow indicator pointing down
      if (isSel) {
        // Radar ring
        const ringR = coreR + 6 * scaleFactor + 2 * Math.sin(t * 4)
        context.save()
        context.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4)
        context.beginPath()
        context.arc(px, py, ringR, 0, 2 * Math.PI)
        context.strokeStyle = '#55d4f5'
        context.lineWidth = 1.8 * scaleFactor
        context.stroke()
        context.restore()

        // Glowing animated downward arrow (▼)
        const bounce = Math.sin(t * 5.5) * 4
        const arrowTipY = py - (coreR + 10 * scaleFactor + bounce)
        const arrowHeight = 14 * scaleFactor
        const arrowTopY = arrowTipY - arrowHeight
        const halfWidth = 8.5 * scaleFactor

        context.save()
        context.shadowColor = '#55d4f5'
        context.shadowBlur = 12
        context.fillStyle = '#55d4f5'

        // Triangle body
        context.beginPath()
        context.moveTo(px, arrowTipY)
        context.lineTo(px - halfWidth, arrowTopY)
        context.lineTo(px + halfWidth, arrowTopY)
        context.closePath()
        context.fill()

        // Inner white shine
        context.fillStyle = '#ffffff'
        context.beginPath()
        context.moveTo(px, arrowTipY - 3 * scaleFactor)
        context.lineTo(px - halfWidth * 0.5, arrowTopY + 2.5 * scaleFactor)
        context.lineTo(px + halfWidth * 0.5, arrowTopY + 2.5 * scaleFactor)
        context.closePath()
        context.fill()

        // Tag pill above arrow
        const tagText = spot.id || 'HOTSPOT'
        context.font = `700 ${Math.max(10, 11 * scaleFactor)}px var(--font-mono)`
        context.textAlign = 'center'
        context.textBaseline = 'bottom'
        const tw = context.measureText(tagText).width
        const padX = 8 * scaleFactor
        const tagH = 18 * scaleFactor
        const tagY = arrowTopY - 4 * scaleFactor

        context.fillStyle = 'rgba(2, 8, 22, 0.92)'
        context.strokeStyle = 'rgba(85, 212, 245, 0.65)'
        context.lineWidth = 1.2 * scaleFactor
        context.beginPath()
        context.roundRect(px - tw / 2 - padX, tagY - tagH, tw + padX * 2, tagH, 5 * scaleFactor)
        context.fill()
        context.stroke()

        context.fillStyle = '#55d4f5'
        context.fillText(tagText, px, tagY - 3 * scaleFactor)
        context.restore()
      }
    }

    // Pre-compute graticule GeoJSON
    const graticuleGeoJSON = d3.geoGraticule().step([10, 10])()

    // ── Main 60fps render loop ─────────────────────────────────────────────
    function render(timestamp) {
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05)
      lastTimestamp = timestamp
      pulseT += dt

      // ── Rotation Logic ───────────────────────────────────────────────────
      // If animating to a selected hotspot
      if (animRef.current) {
        const anim = animRef.current
        if (!anim.initialized) {
          anim.initialized = true
          anim.startTime = timestamp
          anim.duration = 1100 // 1.1 seconds silky glide
          anim.startYaw = rotation[0]
          anim.startPitch = rotation[1]
          anim.deltaYaw = ((((anim.targetYaw - rotation[0]) % 360) + 540) % 360) - 180
          anim.deltaPitch = anim.targetPitch - rotation[1]
          autoRotate = false
        }

        const elapsed = timestamp - anim.startTime
        const progress = Math.min(1, elapsed / anim.duration)
        // Cubic ease out
        const ease = 1 - Math.pow(1 - progress, 3)

        rotation[0] = anim.startYaw + anim.deltaYaw * ease
        rotation[1] = anim.startPitch + anim.deltaPitch * ease
        projection.rotate(rotation)

        if (progress >= 1) {
          animRef.current = null // Arrived smoothly! Stays pointing at target
        }
      } else if (autoRotate) {
        rotation[0] += ROTATION_SPEED * dt
        projection.rotate(rotation)
      }

      context.clearRect(0, 0, W, H)

      const currentScale = projection.scale()
      const sf = currentScale / baseRadius

      // 1. Globe deep-space backdrop
      context.beginPath()
      context.arc(cx, cy, currentScale, 0, 2 * Math.PI)
      context.fillStyle = '#040810'
      context.fill()

      // 2. Outer border ring
      context.beginPath()
      context.arc(cx, cy, currentScale, 0, 2 * Math.PI)
      context.strokeStyle = 'rgba(255,255,255,0.75)'
      context.lineWidth = 1.6 * sf
      context.stroke()

      if (landFeatures) {
        // 3. Graticule
        context.beginPath()
        path(graticuleGeoJSON)
        context.strokeStyle = '#ffffff'
        context.lineWidth = 0.7 * sf
        context.globalAlpha = 0.13
        context.stroke()
        context.globalAlpha = 1

        // 4. Land outlines
        context.beginPath()
        landFeatures.features.forEach(f => path(f))
        context.strokeStyle = 'rgba(255,255,255,0.85)'
        context.lineWidth = 1.0 * sf
        context.stroke()

        // 5. Halftone dot matrix (Batched in single path for maximum FPS)
        const [curYaw, curPitch] = projection.rotate()
        const centerLng = -curYaw
        const centerLat = -curPitch
        const dotRadius = 1.15 * sf

        context.fillStyle = '#999999'
        context.globalAlpha = 0.85
        context.beginPath()

        const maxAngle = Math.PI / 2.02
        for (let i = 0; i < allDots.length; i++) {
          const [lng, lat] = allDots[i]
          const d = d3.geoDistance([lng, lat], [centerLng, centerLat])
          if (d > maxAngle) continue
          const pt = projection([lng, lat])
          if (!pt) continue

          context.moveTo(pt[0] + dotRadius, pt[1])
          context.arc(pt[0], pt[1], dotRadius, 0, 2 * Math.PI)
        }
        context.fill()
        context.globalAlpha = 1

        // 6. Thermal hotspot bloom markers (selected renders on top)
        const spots = hotspotsRef.current
        const sorted = [...spots].sort((a, b) => {
          if (a.id === selectedIdRef.current) return 1
          if (b.id === selectedIdRef.current) return -1
          const frpA = a.satellite?.frp ?? a.frp ?? 0
          const frpB = b.satellite?.frp ?? b.frp ?? 0
          return frpA - frpB
        })
        sorted.forEach(spot => drawHotspot(spot, sf, centerLng, centerLat, pulseT))
      }

      rafId = requestAnimationFrame(render)
    }

    // ── Load Cached Land Data ──────────────────────────────────────────────
    getLandData(16)
      .then(res => {
        landFeatures = res.features
        allDots = res.dots
        setStatus('ready')
        lastTimestamp = performance.now()
        rafId = requestAnimationFrame(render)
      })
      .catch(err => {
        console.error('Failed to load land data:', err)
        setStatus('error')
      })

    // ── Drag & Zoom interaction ────────────────────────────────────────────
    let dragging = false
    let dragStartX = 0, dragStartY = 0
    let dragStartRot = [0, 0]
    let moved = false

    function onMouseDown(e) {
      dragging = true
      moved = false
      autoRotate = false
      animRef.current = null // Cancel any programmatic glide
      if (resumeTimer) clearTimeout(resumeTimer)
      dragStartX = e.clientX
      dragStartY = e.clientY
      dragStartRot = [...rotation]
      canvas.style.cursor = 'grabbing'
    }

    function onMouseMove(e) {
      if (!dragging) return
      const dx = e.clientX - dragStartX
      const dy = e.clientY - dragStartY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true
      rotation[0] = dragStartRot[0] + dx * 0.42
      rotation[1] = Math.max(-85, Math.min(85, dragStartRot[1] - dy * 0.42))
      projection.rotate(rotation)
    }

    function onMouseUp(e) {
      if (!dragging) return
      dragging = false
      canvas.style.cursor = 'grab'

      // Click detection (no drag)
      if (!moved) {
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const [yaw, pitch] = projection.rotate()
        const centerLng = -yaw, centerLat = -pitch

        let best = null, bestDist = 28 * (window.devicePixelRatio || 1)
        hotspotsRef.current.forEach(spot => {
          const angD = d3.geoDistance([spot.lng, spot.lat], [centerLng, centerLat])
          if (angD > Math.PI / 2) return
          const pt = projection([spot.lng, spot.lat])
          if (!pt) return
          const pd = Math.hypot(pt[0] - mx, pt[1] - my)
          if (pd < bestDist) { bestDist = pd; best = spot }
        })

        if (best) {
          onSelectRef.current(best)
          setExplorePopup({ spot: best, x: mx, y: my })
        } else {
          setExplorePopup(null)
        }
      }

      // Resume auto-rotation if no hotspot is selected
      if (!selectedIdRef.current) {
        resumeTimer = setTimeout(() => { autoRotate = true }, 3500)
      }
    }

    function onWheel(e) {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.93 : 1.07
      const newScale = Math.max(baseRadius * 0.5, Math.min(baseRadius * 2.8, projection.scale() * factor))
      projection.scale(newScale)
    }

    function onMouseLeave() {
      if (dragging) {
        dragging = false
        canvas.style.cursor = 'grab'
        if (!selectedIdRef.current) {
          resumeTimer = setTimeout(() => { autoRotate = true }, 3500)
        }
      }
    }

    canvas.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('mouseleave', onMouseLeave)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (resumeTimer) clearTimeout(resumeTimer)
      canvas.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000000',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      />

      {/* Explore More Popup (appears when clicking glowing spot where arrow points) */}
      <AnimatePresence>
        {explorePopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            style={{
              position: 'absolute',
              left: Math.min(Math.max(explorePopup.x - 110, 16), (containerRef.current?.clientWidth || 800) - 260),
              top: Math.max(explorePopup.y - 130, 20),
              zIndex: 30,
              background: 'rgba(3, 8, 20, 0.94)',
              border: '1px solid rgba(85,212,245,0.45)',
              borderRadius: 14,
              padding: '12px 16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 35px rgba(85,212,245,0.25)',
              backdropFilter: 'blur(16px)',
              minWidth: 230,
              maxWidth: 280,
              pointerEvents: 'auto',
              fontFamily: 'var(--font-body)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={14} color="#ff8c00" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {explorePopup.spot.id}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setExplorePopup(null) }}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', padding: 2, display: 'flex',
                }}
              >
                <X size={13} />
              </button>
            </div>

            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: 8 }}>
              <div>{explorePopup.spot.facility?.name || explorePopup.spot.class || 'Thermal Hotspot'}</div>
              <div style={{ color: 'rgba(85,212,245,0.9)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                FRP: <strong>{(explorePopup.spot.satellite?.frp ?? explorePopup.spot.frp ?? 0).toFixed(1)} MW</strong>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onExploreRef.current(explorePopup.spot)
              }}
              style={{
                width: '100%', padding: '8px 12px',
                background: 'linear-gradient(135deg, #55d4f5 0%, #3a6fff 100%)',
                border: 'none', borderRadius: 8,
                color: '#03090f', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6,
                boxShadow: '0 0 16px rgba(85,212,245,0.3)',
              }}
            >
              Explore More <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interaction hint */}
      <div style={{
        position: 'absolute', bottom: 14, left: 14,
        fontSize: 10.5, color: 'rgba(255,255,255,0.42)',
        background: 'rgba(5,8,16,0.82)', backdropFilter: 'blur(8px)',
        padding: '4px 10px', borderRadius: 7,
        border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'var(--font-mono)',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        Drag to rotate · Scroll to zoom · Click hotspot for Explore More
      </div>

      {/* Loading spinner */}
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.08)',
            borderTopColor: 'rgba(255,255,255,0.7)',
            animation: 'spin 0.9s linear infinite',
          }} />
        </div>
      )}

      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'rgba(255,80,80,0.7)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Globe data unavailable
          </span>
        </div>
      )}
    </div>
  )
}
