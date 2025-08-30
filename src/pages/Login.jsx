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
        try {
          localStorage.setItem('remember', '1')
        } catch {}
      } else {
        try {
          localStorage.removeItem('remember')
        } catch {}
      }
      nav('/admin', { replace: true })
    } catch (err) {
      setError(err?.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-3 py-7 bg-[radial-gradient(900px_480px_at_10%_-10%,rgba(2,79,61,0.06),transparent_50%)] bg-[#f5f7fb]">
      <Card className="w-full max-w-2xl">
        {/* Brand header */}
        <div className="grid place-items-center gap-1.5 pb-2 mb-3 border-b border-gray-200">
          <img
            className="w-20 h-20 object-contain drop-shadow-lg"
            src={LOGO_URL}
            alt="Megora Jewels"
          />
          <div className="font-extrabold tracking-wide text-lg text-slate-900">
            Megora Jewels
          </div>
          <div className="text-sm text-gray-500">Admin Login</div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div
              className="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-600"
            >
              Email
            </label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          {/* Password with toggle */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-600"
            >
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                title={showPass ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[BRAND_GREEN] font-bold text-sm px-2 py-1 rounded-md hover:bg-green-100"
                style={{ color: BRAND_GREEN }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2 text-sm text-slate-800">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-gray-300 text-[BRAND_GREEN] focus:ring-[BRAND_GREEN]"
                style={{ accentColor: BRAND_GREEN }}
              />
              <span>Remember me</span>
            </label>
          </div>

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
