import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const BRAND_GREEN = '#024F3D'
const LOGO_URL = 'https://i.ibb.co/5XLbs6Pr/Megora-Gold.png'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password || '987Megora123')
      if (remember) {
        try { localStorage.setItem('remember', '1') } catch {}
      } else {
        try { localStorage.removeItem('remember') } catch {}
      }
      nav('/admin', { replace: true })
    } catch (err) {
      setError(err?.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-center wide">
      <Card>
        {/* Brand header */}
        <div className="auth-brand">
          <img className="auth-logo" src={LOGO_URL} alt="Megora Jewels" />
          <div className="auth-title">Megora Jewels</div>
          <div className="auth-sub">Admin Login</div>
        </div>

        <form onSubmit={onSubmit} className="auth-form vstack" style={{ gap: 12 }}>
          {error && <div className="auth-error" role="alert">{error}</div>}

          {/* Email */}
          <div className="vstack" style={{ gap: 6 }}>
            <label className="auth-label" htmlFor="email">Email</label>
            <Input
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          {/* Password with toggle */}
          <div className="vstack" style={{ gap: 6 }}>
            <label className="auth-label" htmlFor="password">Password</label>
            <div className="auth-pass">
              <Input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-pass-toggle"
                onClick={() => setShowPass(s => !s)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                title={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Row: remember only (forgot password removed) */}
          <div className="auth-row single">
            <label className="auth-check">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </Card>

      {/* Inline scoped styles */}
      <style>{`
        .auth-center {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 28px 12px;
          background:
            radial-gradient(900px 480px at 10% -10%, rgba(2,79,61,0.06), transparent 50%),
            #f5f7fb;
        }
        /* Wider container for the card */
        .auth-center.wide > * {
          width: min(720px, 96vw); /* increased from ~560-640 to 720 for a roomier feel */
        }

        .auth-brand {
          display: grid;
          place-items: center;
          gap: 6px;
          padding-bottom: 8px;
          margin-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .auth-logo {
          width: 72px;
          height: 72px;
          object-fit: contain;
          filter: drop-shadow(0 6px 14px rgba(2,79,61,0.18));
        }
        .auth-title {
          font-weight: 800;
          letter-spacing: .3px;
          font-size: 18px;
          color: #0f172a;
        }
        .auth-sub {
          color: #6b7280;
          font-size: 13px;
        }
        .auth-form { margin-top: 6px; }
        .auth-label { font-size: 13px; color: #6b7280; }

        .auth-pass { position: relative; }
        .auth-pass-toggle {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          color: ${BRAND_GREEN};
          font-weight: 700;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 8px;
        }
        .auth-pass-toggle:hover { background: rgba(2,79,61,0.08); }

        .auth-row.single {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          margin-top: 2px;
        }
        .auth-check {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          color: #0f172a;
          font-size: 14px;
        }

        .auth-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 14px;
        }

        @media (max-width: 420px) {
          .auth-center.wide > * { width: 100%; }
        }
      `}</style>
    </div>
  )
}
