import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center bg-cloud font-extrabold text-navy">Loading CozyDay...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}
