/**
 * ControlPanelLogin.jsx
 * 
 * Glassmorphism dark login modal for district managers.
 * State → District → Email → Password validation.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, ChevronDown, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { STATES_DISTRICTS } from '../data/managers'
import { useNavigate } from 'react-router-dom'

export default function ControlPanelLogin({ onClose }) {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [state,    setState]    = useState('')
  const [district, setDistrict] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const states    = Object.keys(STATES_DISTRICTS)
  const districts = state ? STATES_DISTRICTS[state] : []

  const handleStateChange = (s) => { setState(s); setDistrict(''); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!state || !district) { setError('Please select your state and district.'); return }
    if (!email || !password)  { setError('Please enter your email and password.'); return }

    setLoading(true)
    setError('')

    // Simulate network latency for realism
    await new Promise(r => setTimeout(r, 900))

    const result = login(state, district, email, password)
    setLoading(false)

    if (result.success) {
      onClose()
      navigate('/dashboard')
    } else {
      setError(result.error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,2,8,0.88)',
        backdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        style={{
          width: '100%', maxWidth: 440,
          background: 'rgba(4, 8, 18, 0.92)',
          border: '1px solid rgba(85,212,245,0.14)',
          borderRadius: 20,
          boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 80px rgba(85,212,245,0.06)',
          overflow: 'hidden',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, #55d4f5, #3a6fff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(85,212,245,0.35)',
            }}>
              <Shield size={18} color="#03090f" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                Control Panel
              </div>
              <div style={{ fontSize: 11, color: 'rgba(85,212,245,0.7)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                District Manager Login
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px 28px 28px' }}>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginBottom: 22, lineHeight: 1.6 }}>
            Enter your district credentials to access the Thermal Monitoring Control Panel
            and view data for your assigned area.
          </p>

          {/* State + District row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                STATE
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={state}
                  onChange={e => handleStateChange(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 32px 10px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, color: state ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontSize: 13, fontFamily: 'var(--font-body)',
                    outline: 'none', cursor: 'pointer', appearance: 'none',
                  }}
                >
                  <option value="" disabled style={{ background: '#040812' }}>Select state</option>
                  {states.map(s => <option key={s} value={s} style={{ background: '#040812' }}>{s}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                DISTRICT
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={district}
                  onChange={e => { setDistrict(e.target.value); setError('') }}
                  disabled={!state}
                  style={{
                    width: '100%', padding: '10px 32px 10px 12px',
                    background: state ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, color: district ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontSize: 13, fontFamily: 'var(--font-body)',
                    outline: 'none', cursor: state ? 'pointer' : 'not-allowed', appearance: 'none',
                    opacity: state ? 1 : 0.5,
                  }}
                >
                  <option value="" disabled style={{ background: '#040812' }}>Select district</option>
                  {districts.map(d => <option key={d} value={d} style={{ background: '#040812' }}>{d}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="manager.district@thermalguard.in"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#fff',
                fontSize: 13, fontFamily: 'var(--font-body)',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(85,212,245,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••••"
                style={{
                  width: '100%', padding: '10px 42px 10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: '#fff',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(85,212,245,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)', padding: 0,
                }}
              >
                {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,59,48,0.08)',
                  border: '1px solid rgba(255,59,48,0.22)',
                }}
              >
                <AlertCircle size={14} style={{ color: '#ff3b30', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: 'rgba(255,100,90,0.9)', lineHeight: 1.5 }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px 20px',
              background: loading ? 'rgba(85,212,245,0.12)' : 'linear-gradient(135deg, #55d4f5 0%, #3a6fff 100%)',
              border: 'none', borderRadius: 12,
              color: loading ? 'rgba(85,212,245,0.6)' : '#030c18',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? (
              <>
                <Loader size={16} style={{ animation: 'spin 0.9s linear infinite' }}/>
                Authenticating…
              </>
            ) : (
              <>
                <Shield size={15}/>
                Access Control Panel
              </>
            )}
          </button>

          {/* Demo hint */}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            Demo: State <span style={{ color: 'rgba(85,212,245,0.6)' }}>Gujarat</span> · District <span style={{ color: 'rgba(85,212,245,0.6)' }}>Jamnagar</span>
            <br/>Email: <span style={{ color: 'rgba(85,212,245,0.6)' }}>manager.jamnagar@thermalguard.in</span> · Pass: <span style={{ color: 'rgba(85,212,245,0.6)' }}>TG@jam2026</span>
          </p>
        </form>
      </motion.div>
    </motion.div>
  )
}
