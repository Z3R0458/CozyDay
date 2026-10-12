/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession({
        user: {
          id: 'local-user',
          email: 'local@cozyday.app',
          user_metadata: { display_name: 'Cozy friend' },
        },
      })
      return undefined
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message)
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      loading,
      authError,
      isConfigured: isSupabaseConfigured,
      async signIn(email, password) {
        setAuthError('')
        if (!isSupabaseConfigured) return
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setAuthError(error.message)
          throw error
        }
      },
      async signUp(email, password, displayName) {
        setAuthError('')
        if (!isSupabaseConfigured) return
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        })
        if (error) {
          setAuthError(error.message)
          throw error
        }
      },
      async resetPassword(email) {
        setAuthError('')
        if (!isSupabaseConfigured) return
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) {
          setAuthError(error.message)
          throw error
        }
      },
      async signOut() {
        if (isSupabaseConfigured) await supabase.auth.signOut()
      },
    }),
    [authError, loading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
