/**
 * MiniGlobe.jsx — High-Performance Compact D3 Wireframe Globe
 * Uses shared geoCache and batched dots for 60fps instant loading.
 */

import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { getLandData } from '../utils/geoCache'

export default function MiniGlobe({ lat = 22.47, lng = 69.07, size = 160 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width  = size * dpr
    canvas.height = size * dpr
    canvas.style.width  = `${size}px`
    canvas.style.height = `${size}px`
    context.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.44

    const projection = d3.geoOrthographic()
      .scale(radius)
      .translate([cx, cy])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)
    const graticule = d3.geoGraticule().step([15, 15])()

    let landFeatures = null
    let allDots = []
    let rafId = null
    let angle = -lng // start facing the target longitude
    let pitch = Math.max(-60, Math.min(60, -lat * 0.5))

    function render() {
      angle += 0.35
      projection.rotate([angle, pitch])

      context.clearRect(0, 0, size, size)

      // Base globe disc
      context.beginPath()
      context.arc(cx, cy, radius, 0, 2 * Math.PI)
      context.fillStyle = '#040914'
      context.fill()

      // Border ring
      context.strokeStyle = 'rgba(255,255,255,0.4)'
      context.lineWidth = 1
      context.stroke()

      // Graticule
      context.beginPath()
      path(graticule)
      context.strokeStyle = 'rgba(255,255,255,0.12)'
      context.lineWidth = 0.5
      context.stroke()

      // Land outline & batched dots
      if (landFeatures) {
        context.beginPath()
        landFeatures.features.forEach(f => path(f))
        context.strokeStyle = 'rgba(255,255,255,0.6)'
        context.lineWidth = 0.8
        context.stroke()

        // Land dots (batched single path)
        const [yaw, p] = projection.rotate()
        const centerLng = -yaw, centerLat = -p
        const maxAngle = Math.PI / 2.05
        context.fillStyle = 'rgba(180,180,180,0.7)'
        context.beginPath()

        for (let i = 0; i < allDots.length; i++) {
          const [dLng, dLat] = allDots[i]
          if (d3.geoDistance([dLng, dLat], [centerLng, centerLat]) > maxAngle) continue
          const pt = projection([dLng, dLat])
          if (!pt) continue
          context.moveTo(pt[0] + 0.9, pt[1])
          context.arc(pt[0], pt[1], 0.9, 0, 2 * Math.PI)
        }
        context.fill()
      }

      // Hotspot pin marker
      const [yaw, p] = projection.rotate()
      const centerLng = -yaw, centerLat = -p
      if (d3.geoDistance([lng, lat], [centerLng, centerLat]) <= Math.PI / 2.02) {
        const pt = projection([lng, lat])
        if (pt) {
          // Glow
          const grad = context.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], 12)
          grad.addColorStop(0, '#ff3b30')
          grad.addColorStop(0.5, 'rgba(255,59,48,0.4)')
          grad.addColorStop(1, 'rgba(255,59,48,0)')
          context.fillStyle = grad
          context.beginPath()
          context.arc(pt[0], pt[1], 12, 0, 2 * Math.PI)
          context.fill()

          // Center pin
          context.fillStyle = '#ffffff'
          context.beginPath()
          context.arc(pt[0], pt[1], 2.5, 0, 2 * Math.PI)
          context.fill()
        }
      }

      rafId = requestAnimationFrame(render)
    }

    getLandData(18).then(res => {
      landFeatures = res.features
      allDots = res.dots
      rafId = requestAnimationFrame(render)
    }).catch(console.error)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [lat, lng, size])

  return (
    <div style={{ width: size, height: size, position: 'relative', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 30px rgba(85,212,245,0.15)' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
