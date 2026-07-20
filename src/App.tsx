import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { Splash } from '@/components/Splash'
import { BottomNav, SideNav } from '@/components/Navigation'
import { AuthScreen } from '@/screens/AuthScreen'
import { FeedScreen } from '@/screens/FeedScreen'
import { ExploreScreen } from '@/screens/ExploreScreen'
import { CreatePostScreen } from '@/screens/CreatePostScreen'
import { ReelsScreen } from '@/screens/ReelsScreen'
import { NotificationsScreen } from '@/screens/NotificationsScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { EditProfileScreen } from '@/screens/EditProfileScreen'
import { MessagesScreen } from '@/screens/MessagesScreen'
import { ConversationScreen } from '@/screens/ConversationScreen'
import { PostDetailScreen } from '@/screens/PostDetailScreen'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<AuthRoute><AuthScreen /></AuthRoute>} />
        <Route path="/" element={<ProtectedRoute><FeedScreen /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><ExploreScreen /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreatePostScreen /></ProtectedRoute>} />
        <Route path="/reels" element={<ProtectedRoute><ReelsScreen /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesScreen /></ProtectedRoute>} />
        <Route path="/messages/:conversationId" element={<ProtectedRoute><ConversationScreen /></ProtectedRoute>} />
        <Route path="/u/:username" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
        <Route path="/u/:username/saved" element={<ProtectedRoute><ProfileScreen saved /></ProtectedRoute>} />
        <Route path="/accounts/edit" element={<ProtectedRoute><EditProfileScreen /></ProtectedRoute>} />
        <Route path="/p/:postId" element={<ProtectedRoute><PostDetailScreen /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const initAuth = useAuthStore((s) => s.init)
  const initUI = useUIStore((s) => s.init)
  const loading = useAuthStore((s) => s.loading)
  const session = useAuthStore((s) => s.session)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    initUI()
    initAuth()
  }, [])

  const isAuthRoute = window.location.pathname.startsWith('/login')

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      <BrowserRouter>
        <div className="min-h-screen">
          <AnimatedRoutes />
          {!isAuthRoute && session && !loading && (
            <>
              <SideNav />
              <BottomNav />
            </>
          )}
        </div>
      </BrowserRouter>
    </>
  )
}
