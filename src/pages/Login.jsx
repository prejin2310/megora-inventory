import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('megoraadmin@example.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password || '987Megora123')
      nav('/admin', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="center">
      <Card title="Admin Login">
        <form onSubmit={onSubmit} className="vstack">
          <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="error">{error}</div>}
          <Button type="submit">Sign In</Button>
        </form>
      </Card>
    </div>
  )
}
