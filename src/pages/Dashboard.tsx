import { useEffect, useRef } from 'react'
import { useStore } from '../lib/store'
import StatsCard from '../components/StatsCard'

export default function Dashboard() {
  const ticketStats = useStore((state) => state.ticketStats)
  const tickets = useStore((state) => state.tickets)
  const appConfig = useStore((state) => state.appConfig)
  const fetchTicketStats = useStore((state) => state.fetchTicketStats)
  const initialLoadDone = useRef(false)

  // Get developer name from config
  const developerName = appConfig?.developer_name || null

  // Fetch stats when config is loaded
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    if (developerName) {
      fetchTicketStats(developerName)
    }
  }, [fetchTicketStats, developerName])

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {/* Welcome Header */}
      <div className="text-center mb-12">
        <p className="section-label mb-4">/ BiAgent</p>
        <h1 className="text-h2 mb-4">
          {developerName ? `Welcome, ${developerName}` : 'Welcome'}
        </h1>
        <p className="text-text-muted text-lg max-w-lg">
          Select a ticket from the sidebar to view its pipeline and start automated resolution.
        </p>
      </div>

      {/* Stats Grid */}
      {ticketStats && (
        <div className="grid grid-cols-5 gap-4 max-w-3xl w-full">
          <StatsCard label="Total" value={ticketStats.total} />
          <StatsCard
            label="Completed"
            value={ticketStats.completed}
            color="success"
          />
          <StatsCard
            label="In Progress"
            value={ticketStats.in_progress}
            color="warning"
          />
          <StatsCard label="Pending" value={ticketStats.pending} />
          <StatsCard
            label="Failed"
            value={ticketStats.failed}
            color="error"
          />
        </div>
      )}

      {/* Empty state hint */}
      {tickets.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-text-muted">
            No tickets found. Click "Sync" in the status bar to fetch tickets from JIRA.
          </p>
        </div>
      )}

      {/* Quick tips */}
      <div className="mt-12 max-w-lg text-center">
        <p className="text-xs text-text-muted uppercase tracking-wide mb-4">Quick Tips</p>
        <div className="grid gap-3 text-sm text-text-body">
          <div className="flex items-start gap-3">
            <span className="text-primary font-bold">1.</span>
            <span>Use the sidebar filters to find tickets by pipeline or JIRA status</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-primary font-bold">2.</span>
            <span>Click a ticket to view its 8-step agent pipeline</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-primary font-bold">3.</span>
            <span>Start, pause, or resume pipelines with the control buttons</span>
          </div>
        </div>
      </div>
    </div>
  )
}
