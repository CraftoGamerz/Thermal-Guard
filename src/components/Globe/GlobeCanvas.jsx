/**
 * GlobeCanvas.jsx — passes onLocationClick into the Canvas scene
 */

import React, { useState, Component } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import EarthGlobe from './EarthGlobe'

class GlobeErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(e) { console.warn('Globe error:', e) }
  render() {
    if (this.state.hasError) return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#00050f' }}>
        <div className="w-32 h-32 rounded-full" style={{
          background: 'radial-gradient(circle at 38% 38%, #1a5280, #000814)',
          boxShadow: '0 0 80px rgba(85,212,245,0.15)',
        }} />
      </div>
    )
    return this.props.children
  }
}

function GlobeLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none"
      style={{ background: '#00050f', zIndex: 1 }}>
      <div className="relative">
        <div className="w-24 h-24 rounded-full animate-pulse" style={{
          background: 'radial-gradient(circle at 38% 38%, #1a5280, #000814)',
          boxShadow: '0 0 60px rgba(85,212,245,0.12)',
        }} />
        <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{
          borderTopColor: 'rgba(85,212,245,0.6)', borderRightColor: 'rgba(85,212,245,0.2)',
        }} />
      </div>
      <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'rgba(85,212,245,0.5)', fontFamily: 'var(--font-logo)' }}>Loading Earth…</p>
    </div>
  )
}

export default function GlobeCanvas({ targetLocation }) {
  const [ready, setReady] = useState(false)

  return (
    <div className="globe-wrapper" style={{ background: '#00050f' }}>
      <GlobeErrorBoundary>
        <Canvas
          camera={{ fov: 42, near: 0.05, far: 1500, position: [0, 0.05, 2.65] }}
          dpr={[1, 2]}
          gl={{
            antialias: true, alpha: false,
            powerPreference: 'high-performance',
            toneMapping: THREE.LinearToneMapping,
            toneMappingExposure: 1.4,
          }}
          shadows={false}
          onCreated={() => setReady(true)}
        >
          <EarthGlobe targetLocation={targetLocation} />
        </Canvas>
      </GlobeErrorBoundary>
      {!ready && <GlobeLoader />}
    </div>
  )
}

