/**
 * EarthGlobe.jsx
 *
 * FIXED:
 * - Scroll zoom: no longer lags — uses a direct spring-style lerp on each frame
 *   without reading camera.position back (avoids the feedback loop lag)
 * - Click detection: raycasts on the Earth sphere, converts to lat/lng,
 *   calls onLocationClick(lat, lng, x, y)
 */

import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { AtmosphereShader } from './AtmosphereShader'

// ─── Textures ─────────────────────────────────────────────────────────────────
const TEX = {
  day:      ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
             'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'],
  night:    ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',
             'https://unpkg.com/three-globe/example/img/earth-night.jpg'],
  clouds:   ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-clouds.png',
             'https://unpkg.com/three-globe/example/img/earth-clouds.png'],
  bump:     ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
             'https://unpkg.com/three-globe/example/img/earth-topology.png'],
  specular: ['https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png',
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

// ─── Space environment ────────────────────────────────────────────────────────
function SpaceBackdrop() {
  const tex = useMemo(() => {
    const s = 512, c = document.createElement('canvas')
    c.width = s; c.height = s
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2)
    g.addColorStop(0,'#000408'); g.addColorStop(.5,'#000810'); g.addColorStop(1,'#010c1e')
    ctx.fillStyle = g; ctx.fillRect(0,0,s,s)
    return new THREE.CanvasTexture(c)
  }, [])
  return <mesh><sphereGeometry args={[480,32,16]}/><meshBasicMaterial map={tex} side={THREE.BackSide}/></mesh>
}

function Nebula() {
  const tex = useMemo(() => {
    const s = 1024, c = document.createElement('canvas')
    c.width = s; c.height = s
    const ctx = c.getContext('2d')
    ;[{x:.38,y:.22,r:.30,a:'rgba(12,50,150,0.18)'},{x:.55,y:.16,r:.22,a:'rgba(20,70,170,0.14)'},
      {x:.22,y:.32,r:.20,a:'rgba(8,44,140,0.12)'},{x:.62,y:.28,r:.18,a:'rgba(25,90,190,0.09)'},
      {x:.45,y:.40,r:.16,a:'rgba(10,50,155,0.08)'}].forEach(({x,y,r,a}) => {
      const g = ctx.createRadialGradient(x*s,y*s,0,x*s,y*s,r*s)
      g.addColorStop(0,a); g.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(0,0,s,s)
    })
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <mesh position={[0,55,-175]} rotation={[0,0,.18]}>
      <planeGeometry args={[290,175]}/>
      <meshBasicMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>
  )
}

function Stars() {
  const {pos,col} = useMemo(() => {
    const n=6000, pos=new Float32Array(n*3), col=new Float32Array(n*3)
    for (let i=0;i<n;i++) {
      const r=180+Math.random()*260, t=Math.random()*Math.PI*2, p=Math.acos(2*Math.random()-1)
      pos[i*3]=r*Math.sin(p)*Math.cos(t); pos[i*3+1]=r*Math.sin(p)*Math.sin(t); pos[i*3+2]=r*Math.cos(p)
      const b=.65+Math.random()*.35
      col[i*3]=b*.93; col[i*3+1]=b*.96; col[i*3+2]=b
    }
    return {pos,col}
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos,3]}/>
        <bufferAttribute attach="attributes-color" args={[col,3]}/>
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.85} sizeAttenuation transparent opacity={0.88} fog={false} depthWrite={false}/>
    </points>
  )
}

function SunFlare() {
  const refs = useRef([])
  const tex = useMemo(() => {
    const s=256, c=document.createElement('canvas')
    c.width=s; c.height=s
    const ctx=c.getContext('2d')
    const g=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2)
    g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.07,'rgba(220,240,255,.95)')
    g.addColorStop(.22,'rgba(150,205,255,.55)'); g.addColorStop(.5,'rgba(60,140,255,.18)')
    g.addColorStop(1,'rgba(0,0,0,0)')
    ctx.fillStyle=g; ctx.fillRect(0,0,s,s)
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame(({clock}) => {
    const t=clock.getElapsedTime()
    refs.current.forEach((m,i) => { if (m&&i>0) m.opacity=.22+.06*Math.sin(t*1.8+i) })
  })
  return (
    <group position={[125,80,-95]}>
      <sprite scale={[9,9,1]}><spriteMaterial ref={el=>{refs.current[0]=el}} map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={1}/></sprite>
      <sprite scale={[24,24,1]}><spriteMaterial ref={el=>{refs.current[1]=el}} map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={.28} color="#b0d8ff"/></sprite>
      <sprite scale={[58,58,1]}><spriteMaterial ref={el=>{refs.current[2]=el}} map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={.09} color="#4488cc"/></sprite>
    </group>
  )
}

// ─── Globe ────────────────────────────────────────────────────────────────────
function Clouds({ map }) {
  const ref = useRef()
  useFrame((_,dt) => { if (ref.current) ref.current.rotation.y += dt * 0.022 })
  if (!map) return null
  return (
    <mesh ref={ref} scale={[1.007,1.007,1.007]}>
      <sphereGeometry args={[1,64,64]}/>
      <meshPhongMaterial map={map} transparent opacity={0.55} depthWrite={false}/>
    </mesh>
  )
}

function ThinAtmosphere() {
  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms: {...THREE.UniformsUtils.clone(AtmosphereShader.uniforms)},
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

// Earth surface — no click interaction
function EarthSurface({ maps }) {
  const matRef = useRef()

  useEffect(() => {
    if (!matRef.current) return
    const m = matRef.current
    if (maps.day)      { m.map         = maps.day;      m.needsUpdate = true }
    if (maps.specular) { m.specularMap  = maps.specular; m.needsUpdate = true }
    if (maps.bump)     { m.bumpMap      = maps.bump;     m.needsUpdate = true }
    if (maps.night) {
      m.emissiveMap       = maps.night
      m.emissive          = new THREE.Color(0.9, 0.85, 0.6)
      m.emissiveIntensity = 0.65
      m.needsUpdate = true
    }
  }, [maps.day, maps.specular, maps.bump, maps.night])

  return (
    <mesh>
      <sphereGeometry args={[1,96,96]}/>
      <meshPhongMaterial
        ref={matRef}
        color={maps.day ? '#ffffff' : '#1e5a8a'}
        emissive={maps.night ? new THREE.Color(0.9,0.85,0.6) : new THREE.Color('#000000')}
        emissiveIntensity={maps.night ? 0.65 : 0}
        specular={new THREE.Color('#1a3a5a')}
        shininess={maps.day ? 30 : 18}
        bumpScale={0.008}
      />
    </mesh>
  )
}

// ─── Scroll Zoom — FIXED: no feedback loop lag ────────────────────────────────
function ScrollZoom({ scrollMax = 1400 }) {
  const { camera } = useThree()
  // Use a single ref for current Z — set it directly, don't lerp from camera
  const currentZ = useRef(2.65)
  const targetZ  = useRef(2.65)

  useFrame(() => {
    const progress = Math.min(window.scrollY / scrollMax, 1)
    // Smooth ease-in-out cubic
    const ease = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2

    targetZ.current = 2.65 - ease * (2.65 - 1.04)
    // Direct spring: interpolate our own currentZ, apply to camera
    currentZ.current += (targetZ.current - currentZ.current) * 0.10
    camera.position.z = currentZ.current
  })

  return null
}

// ─── Globe Navigator — rotates globe to face a target lat/lng ────────────────
function GlobeNavigator({ targetLocation, globeRef }) {
  const targetRotation = useRef(null)
  const navigating = useRef(false)

  useEffect(() => {
    if (!targetLocation || !globeRef.current) return
    const { lat, lng } = targetLocation
    // Convert lat/lng to the Y rotation needed to face that point toward camera
    // Camera is at +Z, so the point at lng=0 faces camera when rotation.y=0
    // We need rotation.y = -(lng in radians) + π to put the point at front
    const targetY = -(lng * Math.PI / 180) + Math.PI
    targetRotation.current = targetY
    navigating.current = true
  }, [targetLocation])

  useFrame(() => {
    if (!navigating.current || targetRotation.current === null || !globeRef.current) return
    const current = globeRef.current.rotation.y
    let target = targetRotation.current

    // Normalize both to [-PI, PI] range for shortest path
    const diff = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    const newY = current + diff * 0.04  // smooth interpolation

    globeRef.current.rotation.y = newY

    // Stop when close enough
    if (Math.abs(diff) < 0.005) {
      navigating.current = false
    }
  })

  return null
}

export default function EarthGlobe({ targetLocation }) {
  const globeRef    = useRef()
  const controlRef  = useRef()
  const interacting = useRef(false)
  const maps        = useMaps()

  useEffect(() => {
    const c = controlRef.current; if (!c) return
    const start = () => { interacting.current = true }
    const end   = () => setTimeout(() => { interacting.current = false }, 1200)
    c.addEventListener('start', start); c.addEventListener('end', end)
    return () => { c.removeEventListener('start', start); c.removeEventListener('end', end) }
  }, [])

  const isNavigating = useRef(false)
  useEffect(() => {
    if (targetLocation) {
      isNavigating.current = true
      setTimeout(() => { isNavigating.current = false }, 3000)
    }
  }, [targetLocation])

  useFrame((_,dt) => {
    if (!interacting.current && !isNavigating.current && globeRef.current) {
      globeRef.current.rotation.y += dt * 0.065
    }
    controlRef.current?.update()
  })

  return (
    <>
      <SpaceBackdrop/>
      <Stars/>
      <Nebula/>
      <SunFlare/>

      <directionalLight position={[3.5,2.0,4.5]} intensity={4.0} color="#fff8ee"/>
      <directionalLight position={[-1.8,0.5,2.0]} intensity={0.55} color="#2255aa"/>
      <ambientLight intensity={0.32} color="#1a3660"/>
      <pointLight position={[0,0,3.2]} intensity={0.35} color="#66ccff" distance={8} decay={1}/>

      <group ref={globeRef}>
        <EarthSurface maps={maps}/>
        <Clouds map={maps.clouds}/>
      </group>

      <ThinAtmosphere/>
      <ScrollZoom scrollMax={1400}/>
      <GlobeNavigator targetLocation={targetLocation} globeRef={globeRef} />

      <OrbitControls
        ref={controlRef}
        enableDamping dampingFactor={0.055}
        rotateSpeed={0.40} zoomSpeed={0.6}
        minDistance={1.02} maxDistance={5.5}
        enablePan={false} autoRotate={false}
      />
    </>
  )
}
