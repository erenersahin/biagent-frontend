import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TicketDetail from './pages/TicketDetail'
import { useWebSocket } from './hooks/useWebSocket'
import { useStore } from './lib/store'

function App() {
  const { connect } = useWebSocket()
  const restoreSession = useStore((state) => state.restoreSession)
  const initialized = useRef(false)

  useEffect(() => {
    // Prevent duplicate calls from StrictMode
    if (initialized.current) return
    initialized.current = true

    // Connect WebSocket
    connect()

    // Restore session
    restoreSession()
  }, [connect, restoreSession])

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
