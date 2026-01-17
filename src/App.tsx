import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TicketDetail from './pages/TicketDetail'
import { useWebSocket } from './hooks/useWebSocket'
import { useStore } from './lib/store'

function App() {
  const { connect } = useWebSocket()
  const restoreSession = useStore((state) => state.restoreSession)

  useEffect(() => {
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
