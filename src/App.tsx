import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TicketDetail from './pages/TicketDetail'
import SharedView from './pages/SharedView'
import { useWebSocket } from './hooks/useWebSocket'
import { useStore } from './lib/store'

function App() {
  const { connect } = useWebSocket()
  const restoreSession = useStore((state) => state.restoreSession)
  const initialized = useRef(false)
  const location = useLocation()

  // Check if we're on a shared view (public route)
  const isSharedView = location.pathname.startsWith('/share/')

  useEffect(() => {
    // Skip WebSocket and session restore for shared views
    if (isSharedView) return

    // Prevent duplicate calls from StrictMode
    if (initialized.current) return
    initialized.current = true

    // Connect WebSocket
    connect()

    // Restore session
    restoreSession()
  }, [connect, restoreSession, isSharedView])

  // Shared view has its own layout
  if (isSharedView) {
    return (
      <Routes>
        <Route path="/share/:token" element={<SharedView />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ticket/:ticketKey" element={<TicketDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
