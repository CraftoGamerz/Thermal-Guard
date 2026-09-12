/**
 * DashboardGlobe.jsx
 *
 * Photorealistic Three.js globe for the Dashboard.
 * - Blue Marble day texture + night city lights emissive
 * - Cloud layer, atmosphere rim, star field, space backdrop
 * - Glowing thermal hotspot sprites rendered on the globe surface
 *   with pulsing red/orange/yellow/green bloom effects
 * - Supports selectedHotspotId (white pulse ring), onSelectHotspot callback
 * - Smooth auto-rotation, drag via OrbitControls
 * - Camera auto-navigates to selected hotspot lat/lng
 */

import { useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { AtmosphereShader } from './Globe/AtmosphereShader'

// ── Texture URLs ──────────────────────────────────────────────────────────────
const TEX = {
  day:     ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
             'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'],
  night:   ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',
             'https://unpkg.com/three-globe/example/img/earth-night.jpg'],
  clouds:  ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png',
             'https://unpkg.com/three-globe/example/img/earth-clouds.png'],
  bump:    ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
             'https://unpkg.com/three-globe/example/img/earth-topology.png'],
  specular:['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png',
             'https://unpkg.com/three-globe/example/img/earth-water.png'],
}

function loadTex(urls, srgb = true) {
  const loader = new THREE.TextureLoader()
  loader.crossOrigin = 'anonymous'
  return new Promise((resolve) => {
    const tryNext = (i) => {
      if (i >= urls.length) { resolve(null); return }
      loader.load(urls[i], (t) => {
        if (srgb) t.colorSpace = THREE.SRGBColorSpace
        resolve(t)
      }, undefined, () => tryNext(i + 1))
    }
    tryNext(0)
  })
}

function useMaps() {
  const [maps, setMaps] = useState({ day: null, night: null, clouds: null, bump: null, specular: null })
  useEffect(() => {
    let alive = true
    Promise.all([
      loadTex(TEX.day), loadTex(TEX.night),
      loadTex(TEX.clouds), loadTex(TEX.bump, false), loadTex(TEX.specular, false),
    ]).then(([day, night, clouds, bump, specular]) => {
      if (alive) setMaps({ day, night, clouds, bump, specular })
    })
    return () => { alive = false }
  }, [])
  return maps
}

// ── Space environment ─────────────────────────────────────────────────────────
function SpaceBackdrop() {
  const tex = useMemo(() => {
    const s = 512, c = document.createElement('canvas')
    c.width = s; c.height = s
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
    g.addColorStop(0, '#000408'); g.addColorStop(.5, '#000810'); g.addColorStop(1, '#010c1e')
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
    return new THREE.CanvasTexture(c)
  }, [])
  return <mesh><sphereGeometry args={[480,32,16]}/><meshBasicMaterial map={tex} side={THREE.BackSide}/></mesh>
}

function Stars() {
  const { pos, col } = useMemo(() => {
    const n = 5000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = 180 + Math.random() * 260, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1)
      pos[i*3] = r*Math.sin(p)*Math.cos(t); pos[i*3+1] = r*Math.sin(p)*Math.sin(t); pos[i*3+2] = r*Math.cos(p)
      const b = .65 + Math.random() * .35
      col[i*3] = b*.93; col[i*3+1] = b*.96; col[i*3+2] = b
    }
    return { pos, col }
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]}/>
        <bufferAttribute attach="attributes-color" args={[col, 3]}/>
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.75} sizeAttenuation transparent opacity={0.85} fog={false} depthWrite={false}/>
    </points>
  )
}

// ── Atmosphere rim ────────────────────────────────────────────────────────────
function ThinAtmosphere() {
  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.clone(AtmosphereShader.uniforms) },
      vertexShader: AtmosphereShader.vertexShader,
      fragmentShader: AtmosphereShader.fragmentShader,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
    })
    m.uniforms.atmosphereColor.value = new THREE.Color('#44bbdd')
    m.uniforms.coefficient.value = 0.65
    m.uniforms.power.value = 4.5
    m.uniforms.opacity.value = 0.85
    return m
  }, [])
  return <mesh scale={[1.022,1.022,1.022]}><sphereGeometry args={[1,64,64]}/><primitive object={mat} attach="material"/></mesh>
}

// ── Clouds ────────────────────────────────────────────────────────────────────
function Clouds({ map }) {
  const ref = useRef()
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02 })
  if (!map) return null
  return (
    <mesh ref={ref} scale={[1.006,1.006,1.006]}>
      <sphereGeometry args={[1,64,64]}/>
      <meshPhongMaterial map={map} transparent opacity={0.45} depthWrite={false}/>
    </mesh>
  )
}

// ── Earth surface ─────────────────────────────────────────────────────────────
function EarthSurface({ maps }) {
  return (
    <mesh>
      <sphereGeometry args={[1, 96, 96]}/>
      <meshPhongMaterial
        map={maps.day || undefined}
        emissiveMap={maps.night || undefined}
        emissive={maps.night ? new THREE.Color('#ffffff') : new THREE.Color('#000000')}
        emissiveIntensity={maps.night ? 0.85 : 0}
        bumpMap={maps.bump || undefined}
        bumpScale={maps.bump ? 0.025 : 0}
        specularMap={maps.specular || undefined}
        specular={new THREE.Color('#2244aa')}
        shininess={25}
      />
    </mesh>
  )
}

// ── Create glow sprite texture ────────────────────────────────────────────────
function makeGlowTexture(color) {
  const s = 128, c = document.createElement('canvas')
  c.width = s; c.height = s
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  g.addColorStop(0, color.replace(')', ', 1)').replace('rgb', 'rgba'))
  g.addColorStop(0.15, color.replace(')', ', 0.85)').replace('rgb', 'rgba'))
  g.addColorStop(0.4, color.replace(')', ', 0.45)').replace('rgb', 'rgba'))
  g.addColorStop(0.7, color.replace(')', ', 0.15)').replace('rgb', 'rgba'))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

// Pre-bake glow textures
const GLOW_TEXTURES = {
  critical: makeGlowTexture('rgb(255, 45, 30)'),
  high:     makeGlowTexture('rgb(255, 140, 0)'),
  warning:  makeGlowTexture('rgb(255, 210, 30)'),
  low:      makeGlowTexture('rgb(80, 220, 100)'),
  selected: makeGlowTexture('rgb(255, 255, 255)'),
}

function getGlowConfig(frp, isSelected) {
  if (isSelected) return { tex: GLOW_TEXTURES.selected, scale: 0.095, pulse: true }
  if (frp >= 100) return { tex: GLOW_TEXTURES.critical, scale: 0.072, pulse: true }
  if (frp >= 50)  return { tex: GLOW_TEXTURES.high,     scale: 0.056, pulse: false }
  if (frp >= 10)  return { tex: GLOW_TEXTURES.warning,  scale: 0.046, pulse: false }
  return              { tex: GLOW_TEXTURES.low,      scale: 0.038, pulse: false }
}

// Convert lat/lng to 3D point on unit sphere
function latLngToVec3(lat, lng, radius = 1.02) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  )
}

// ── Single Hotspot Glow Sprite ────────────────────────────────────────────────
function HotspotSprite({ spot, isSelected, onClick }) {
  const matRef = useRef()
  const config = getGlowConfig(spot.frp, isSelected)
  const pos = useMemo(() => latLngToVec3(spot.lat, spot.lng), [spot.lat, spot.lng])

  useFrame(({ clock }) => {
    if (matRef.current && config.pulse) {
      const t = clock.getElapsedTime()
      matRef.current.opacity = isSelected
        ? 0.88 + 0.12 * Math.sin(t * 3.5)
        : 0.75 + 0.25 * Math.sin(t * 2.0 + spot.lng)
    }
  })

  return (
    <sprite
      position={pos}
      scale={[config.scale, config.scale, 1]}
      onClick={(e) => { e.stopPropagation(); onClick(spot) }}
    >
      <spriteMaterial
        ref={matRef}
        map={config.tex}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={0.85}
      />
    </sprite>
  )
}

// ── All Hotspot Sprites layer ─────────────────────────────────────────────────
function HotspotsLayer({ hotspots, selectedId, onSelect, globeRef }) {
  return (
    <>
      {hotspots.map(spot => (
        <HotspotSprite
          key={spot.id}
          spot={spot}
          isSelected={spot.id === selectedId}
          onClick={onSelect}
        />
      ))}
    </>
  )
}

// ── Camera navigator: smoothly moves camera to focus on lat/lng ───────────────
function CameraNavigator({ targetLatLng }) {
  const { camera } = useThree()
  const targetQ = useRef(null)
  const navigating = useRef(false)

  useEffect(() => {
    if (!targetLatLng) return
    const [lat, lng] = targetLatLng
    // Compute ideal camera position orbiting around Earth to face that point
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    const dist = 2.6
    const target = new THREE.Vector3(
      -dist * Math.sin(phi) * Math.cos(theta),
       dist * Math.cos(phi),
       dist * Math.sin(phi) * Math.sin(theta)
    )
    // Store as quaternion rotation of camera
    const dummy = new THREE.Object3D()
    dummy.position.copy(camera.position)
    targetQ.current = target
    navigating.current = true
  }, [targetLatLng])

  useFrame(() => {
    if (!navigating.current || !targetQ.current) return
    camera.position.lerp(targetQ.current, 0.05)
    camera.lookAt(0, 0, 0)
    if (camera.position.distanceTo(targetQ.current) < 0.01) {
      navigating.current = false
    }
  })

  return null
}

// ── Main Globe scene ──────────────────────────────────────────────────────────
function GlobeScene({ hotspots, selectedId, onSelect, targetLatLng }) {
  const globeRef = useRef()
  const controlRef = useRef()
  const interacting = useRef(false)
  const maps = useMaps()

  useEffect(() => {
    const c = controlRef.current; if (!c) return
    const start = () => { interacting.current = true }
    const end   = () => setTimeout(() => { interacting.current = false }, 1500)
    c.addEventListener('start', start); c.addEventListener('end', end)
    return () => { c.removeEventListener('start', start); c.removeEventListener('end', end) }
  }, [])

  useFrame((_, dt) => {
    if (!interacting.current && globeRef.current) {
      globeRef.current.rotation.y += dt * 0.055
    }
    controlRef.current?.update()
  })

  return (
    <>
      <SpaceBackdrop />
      <Stars />

      <directionalLight position={[3.5, 2.0, 4.5]} intensity={4.0} color="#fff8ee"/>
      <directionalLight position={[-1.8, 0.5, 2.0]} intensity={0.55} color="#2255aa"/>
      <ambientLight intensity={0.32} color="#1a3660"/>
      <pointLight position={[0, 0, 3.2]} intensity={0.35} color="#66ccff" distance={8} decay={1}/>

      <group ref={globeRef}>
        <EarthSurface maps={maps} />
        <Clouds map={maps.clouds} />
        <HotspotsLayer
          hotspots={hotspots}
          selectedId={selectedId}
          onSelect={onSelect}
          globeRef={globeRef}
        />
      </group>

      <ThinAtmosphere />
      <CameraNavigator targetLatLng={targetLatLng} />

      <OrbitControls
        ref={controlRef}
        enableDamping dampingFactor={0.06}
        rotateSpeed={0.45} zoomSpeed={0.6}
        minDistance={1.15} maxDistance={5.5}
        enablePan={false}
      />
    </>
  )
}

// ── Error boundary ────────────────────────────────────────────────────────────
import { Component } from 'react'
class GlobeErrorBoundary extends Component {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() {
    if (this.state.err) return (
      <div style={{ width:'100%', height:'100%', background:'#000810',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:13, fontFamily:'monospace' }}>Globe unavailable</div>
      </div>
    )
    return this.props.children
  }
}

// ── Public export ─────────────────────────────────────────────────────────────
export default function DashboardGlobe({ hotspots = [], selectedId = null, onSelect = () => {}, targetLatLng = null }) {
  return (
    <GlobeErrorBoundary>
      <Canvas
        camera={{ fov: 38, position: [0, 0, 2.65] }}
        dpr={[1, 2]}
        gl={{
          antialias: true, alpha: false,
          toneMapping: THREE.LinearToneMapping,
          toneMappingExposure: 1.4,
        }}
        style={{ width: '100%', height: '100%', background: '#000408' }}
      >
        <GlobeScene
          hotspots={hotspots}
          selectedId={selectedId}
          onSelect={onSelect}
          targetLatLng={targetLatLng}
        />
      </Canvas>
    </GlobeErrorBoundary>
  )
}
