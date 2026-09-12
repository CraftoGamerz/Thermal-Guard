/**
 * Footer.jsx — Adapted from footer.txt prompt.
 *
 * Hover text effect with "CompileX" branding, team logo,
 * gradient background, contact info, social links.
 * Minimalist dark theme matching ThermalGuard.
 */

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Globe, Shield } from 'lucide-react'

// ── Custom Social Icons ───────────────────────────────────────────────────────
const GithubIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

const LinkedinIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

const TwitterIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
)

// ── TextHoverEffect — SVG text with gradient reveal on hover ──────────────────
function TextHoverEffect({ text, duration = 0, className = '' }) {
  const svgRef = useRef(null)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const [maskPosition, setMaskPosition] = useState({ cx: '50%', cy: '50%' })

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect()
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100
      setMaskPosition({ cx: `${cxPercentage}%`, cy: `${cyPercentage}%` })
    }
  }, [cursor])

  return (
    <svg
      ref={svgRef}
      width="100%" height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={className}
      style={{ cursor: 'pointer', userSelect: 'none', textTransform: 'uppercase' }}
    >
      <defs>
        <linearGradient id="textGradient" gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="25%">
          {hovered && (
            <>
              <stop offset="0%" stopColor="#55d4f5" />
              <stop offset="25%" stopColor="#3a6fff" />
              <stop offset="50%" stopColor="#80eeb4" />
              <stop offset="75%" stopColor="#55d4f5" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </>
          )}
        </linearGradient>
        <motion.radialGradient
          id="revealMask" gradientUnits="userSpaceOnUse" r="20%"
          initial={{ cx: '50%', cy: '50%' }} animate={maskPosition}
          transition={{ duration, ease: 'easeOut' }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="textMask">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)" />
        </mask>
      </defs>

      {/* Ghost outline text */}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        strokeWidth="0.3" style={{ opacity: hovered ? 0.7 : 0, fontFamily: 'Inter, sans-serif' }}
        className="fill-transparent" stroke="rgba(255,255,255,0.15)"
        fontSize="72" fontWeight="800"
      >{text}</text>

      {/* Animated stroke text */}
      <motion.text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        strokeWidth="0.3" className="fill-transparent" stroke="#55d4f5"
        style={{ fontFamily: 'Inter, sans-serif' }} fontSize="72" fontWeight="800"
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{ strokeDashoffset: 0, strokeDasharray: 1000 }}
        transition={{ duration: 4, ease: 'easeInOut' }}
      >{text}</motion.text>

      {/* Gradient masked text */}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        stroke="url(#textGradient)" strokeWidth="0.3" mask="url(#textMask)"
        className="fill-transparent" style={{ fontFamily: 'Inter, sans-serif' }}
        fontSize="72" fontWeight="800"
      >{text}</text>
    </svg>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
export default function Footer() {
  const footerLinks = [
    {
      title: 'Platform',
      links: [
        { label: 'Operations Map', href: '#' },
        { label: 'Event Detail', href: '#' },
        { label: 'Review Queue', href: '#' },
        { label: 'Model Evidence', href: '#' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '#' },
        { label: 'API Reference', href: '#' },
        { label: 'NASA FIRMS Data', href: 'https://firms.modaps.eosdis.nasa.gov/' },
        { label: 'Research Papers', href: '#' },
      ],
    },
  ]

  const contactInfo = [
    { icon: Mail, text: 'compilex@thermalguard.ai', href: 'mailto:compilex@thermalguard.ai' },
    { icon: Phone, text: '+91 86373 73116', href: 'tel:+918637373116' },
    { icon: MapPin, text: 'India' },
  ]

  const socialLinks = [
    { icon: GithubIcon, label: 'GitHub', href: 'https://github.com/sankirtansyadavofficial-Hack/ThermalGuard' },
    { icon: LinkedinIcon, label: 'LinkedIn', href: '#' },
    { icon: TwitterIcon, label: 'Twitter', href: '#' },
    { icon: Globe, label: 'Website', href: '#' },
  ]

  return (
    <footer style={{
      position: 'relative', overflow: 'hidden', margin: 24,
      borderRadius: 24, background: 'rgba(15,15,17,0.1)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(125% 125% at 50% 10%, rgba(15,15,17,0.4) 50%, rgba(85,212,245,0.12) 100%)',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(32px,5vw,56px)', position: 'relative', zIndex: 10 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'clamp(24px,4vw,48px)',
          paddingBottom: 40,
        }}>
          {/* Brand section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <img src="/compilex-logo.png" alt="CompileX" style={{
                width: 36, height: 36, borderRadius: 8, objectFit: 'contain',
              }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                Compile<span style={{ color: '#55d4f5' }}>X</span>
              </span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', maxWidth: 260 }}>
              AI-based classification of industrial fires and persistent thermal sources. 
              From thermal anomaly to explainable industrial-risk intelligence.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
              <Shield size={14} color="#55d4f5" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#55d4f5',
                letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                THERMALGUARD
              </span>
            </div>
          </div>

          {/* Link sections */}
          {footerLinks.map(section => (
            <div key={section.title}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18, letterSpacing: '-0.01em' }}>
                {section.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {section.links.map(link => (
                  <li key={link.label} style={{ marginBottom: 10 }}>
                    <a href={link.href} style={{
                      fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
                      transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => { e.target.style.color = '#55d4f5' }}
                      onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.45)' }}
                    >{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 18, letterSpacing: '-0.01em' }}>
              Contact
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {contactInfo.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <item.icon size={15} color="#55d4f5" />
                  {item.href ? (
                    <a href={item.href} style={{
                      fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
                      transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => { e.target.style.color = '#55d4f5' }}
                      onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.45)' }}
                    >{item.text}</a>
                  ) : (
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 24px' }} />

        {/* Bottom bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        }}>
          {/* Social icons */}
          <div style={{ display: 'flex', gap: 16 }}>
            {socialLinks.map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} aria-label={label} style={{
                color: 'rgba(255,255,255,0.35)', transition: 'color 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = '#55d4f5' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
              >
                <Icon size={18} />
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            © {new Date().getFullYear()} CompileX. All rights reserved.
          </p>
        </div>
      </div>

      {/* Big hover text effect */}
      <div style={{
        display: 'flex', height: '22rem', marginTop: '-11rem', marginBottom: '-8rem',
        position: 'relative', zIndex: 50,
      }} className="hidden lg:flex">
        <TextHoverEffect text="CompileX" />
      </div>
    </footer>
  )
}
