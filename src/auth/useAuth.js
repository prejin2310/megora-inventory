import { useContext } from 'react'
import { useAuth as useCtx } from './AuthContext'
export default function useAuth() { return useCtx() }
