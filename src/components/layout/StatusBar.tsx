import { useStore } from '../../lib/store'
import * as api from '../../lib/api'

interface StatusBarProps {
  className?: string
}

export default function StatusBar({ className = '' }: StatusBarProps) {
  const lastSynced = useStore((state) => state.lastSynced)
  const loading = useStore((state) => state.loading.tickets)
  const wsStatus = useStore((state) => state.wsStatus)
  const fetchTickets = useStore((state) => state.fetchTickets)
  const fetchTicketStats = useStore((state) => state.fetchTicketStats)
  const appConfig = useStore((state) => state.appConfig)

  const handleSync = async () => {
    try {
      await api.triggerSync()
      fetchTickets()
      if (appConfig?.developer_name) {
        fetchTicketStats(appConfig.developer_name)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  // Format last synced time
  const formatLastSynced = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return date.toLocaleDateString()
  }

  // Connection status indicator
  const getConnectionStatus = () => {
    switch (wsStatus) {
      case 'connected':
        return { color: 'bg-success', text: 'Connected' }
      case 'connecting':
        return { color: 'bg-warning animate-pulse', text: 'Connecting...' }
      case 'disconnected':
        return { color: 'bg-error', text: 'Disconnected' }
      default:
        return { color: 'bg-pending', text: 'Unknown' }
    }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div
      className={`h-10 bg-primary-dark flex items-center justify-between px-4 text-xs ${className}`}
    >
      {/* Left side: Connection status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connectionStatus.color}`} />
          <span className="text-gray-400 font-mono uppercase tracking-wide">
            {connectionStatus.text}
          </span>
        </div>
      </div>

      {/* Right side: Sync info and button */}
      <div className="flex items-center gap-4">
        <span className="text-gray-400">
          Last sync: <span className="text-gray-300">{formatLastSynced(lastSynced)}</span>
        </span>

        <button
          onClick={handleSync}
          disabled={loading}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 font-mono uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Syncing...' : 'Sync'}
        </button>
      </div>
    </div>
  )
}
