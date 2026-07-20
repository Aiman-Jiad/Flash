import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/Spinner'

type Mode = 'login' | 'signup' | 'reset'

export function AuthScreen() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null); setLoading(true)
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        })
        if (error) throw error
        setInfo('Password reset link sent. Check your inbox.')
      } else if (mode === 'signup') {
        const cleanUsername = (username || email.split('@')[0]).trim().replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '') || 'user'
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: cleanUsername,
            full_name: '',
            bio: '',
          })
        }
        setInfo('Account created! You can sign in now.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/', { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function googleSignIn() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-accent-50/30 dark:from-black dark:via-neutral-950 dark:to-accent-950/20 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-accent-400/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-strong rounded-3xl shadow-2xl shadow-neutral-900/5 dark:shadow-black/40 p-8 border border-white/40 dark:border-white/5">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/30 mb-3">
              <svg viewBox="0 0 64 64" className="w-10 h-10">
                <path d="M34 12 L20 36 H30 L28 52 L44 26 H34 Z" fill="white" />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Flash</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.input
                  key="username"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500/40 transition"
                  required
                />
              )}
            </AnimatePresence>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500/40 transition"
              required
            />

            {mode !== 'reset' && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500/40 transition"
                required
                minLength={6}
              />
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
                {error}
              </motion.div>
            )}
            {info && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg px-3 py-2">
                {info}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold shadow-lg shadow-accent-500/30 hover:shadow-accent-500/40 hover:brightness-105 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Spinner className="text-white" />}
              {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
            </button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                <span className="text-xs text-neutral-400">OR</span>
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
              </div>
              <button
                onClick={googleSignIn}
                className="w-full py-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-medium flex items-center justify-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-[0.98] transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}

          <div className="flex justify-between mt-6 text-sm text-neutral-500 dark:text-neutral-400">
            {mode === 'login' ? (
              <>
                <button onClick={() => setMode('reset')} className="hover:text-accent-500 transition">Forgot password?</button>
                <button onClick={() => setMode('signup')} className="hover:text-accent-500 transition">Create account</button>
              </>
            ) : (
              <button onClick={() => setMode('login')} className="hover:text-accent-500 transition mx-auto">← Back to login</button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
