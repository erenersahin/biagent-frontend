import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import TicketCard from '../components/TicketCard'
import StatsCard from '../components/StatsCard'
import * as api from '../lib/api'

export default function Dashboard() {
  const tickets = useStore((state) => state.tickets)
  const ticketStats = useStore((state) => state.ticketStats)
  const loading = useStore((state) => state.loading.tickets)
  const appConfig = useStore((state) => state.appConfig)
  const fetchTickets = useStore((state) => state.fetchTickets)
  const fetchTicketStats = useStore((state) => state.fetchTicketStats)
  const fetchAppConfig = useStore((state) => state.fetchAppConfig)
  const initialLoadDone = useRef(false)

  // Get developer name from config
  const developerName = appConfig?.developer_name || null

  // Filter state
  const [assigneeFilter, setAssigneeFilter] = useState<'me' | 'all'>('me')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [epicFilter, setEpicFilter] = useState<string>('all')

  // Fetch app config on mount
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    fetchAppConfig()
  }, [fetchAppConfig])

  // Fetch tickets and stats when config is loaded
  useEffect(() => {
    if (!initialLoadDone.current) return
    fetchTickets()
    // Stats are always developer-centric
    if (developerName) {
      fetchTicketStats(developerName)
    }
  }, [fetchTickets, fetchTicketStats, developerName])

  // Extract unique epics from tickets
  const epics = useMemo(() => {
    const epicMap = new Map<string, string>()
    tickets.forEach((ticket) => {
      if (ticket.epic_key && ticket.epic_name) {
        epicMap.set(ticket.epic_key, ticket.epic_name)
      }
    })
    return Array.from(epicMap.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [tickets])

  // Extract unique statuses from tickets
  const statuses = useMemo(() => {
    const statusSet = new Set<string>()
    tickets.forEach((ticket) => {
      if (ticket.status) {
        statusSet.add(ticket.status)
      }
    })
    return Array.from(statusSet).sort()
  }, [tickets])

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Assignee filter
      if (assigneeFilter === 'me' && developerName && ticket.assignee !== developerName) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && ticket.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }

      // Epic filter
      if (epicFilter === 'none' && ticket.epic_key) {
        return false
      }
      if (epicFilter !== 'all' && epicFilter !== 'none' && ticket.epic_key !== epicFilter) {
        return false
      }

      return true
    })
  }, [tickets, assigneeFilter, statusFilter, epicFilter, developerName])

  const handleSync = async () => {
    try {
      await api.triggerSync()
      fetchTickets()
      if (developerName) {
        fetchTicketStats(developerName)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label mb-2">/ Dashboard</p>
          <h1 className="text-h2">{developerName ? `${developerName}'s Tickets` : 'Your Tickets'}</h1>
        </div>
        <button onClick={handleSync} className="btn btn-secondary">
          Sync JIRA
        </button>
      </div>

      {/* Stats - Developer-centric */}
      {ticketStats && (
        <div className="grid grid-cols-5 gap-4">
          <StatsCard label="My Tickets" value={ticketStats.total} />
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

      {/* Filters */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Assignee Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted font-medium">Assignee:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button
              onClick={() => setAssigneeFilter('me')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                assigneeFilter === 'me'
                  ? 'bg-primary text-primary-dark'
                  : 'bg-white text-text-body hover:bg-gray-100'
              }`}
            >
              Me
            </button>
            <button
              onClick={() => setAssigneeFilter('all')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                assigneeFilter === 'all'
                  ? 'bg-primary text-primary-dark'
                  : 'bg-white text-text-body hover:bg-gray-100'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Epic Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted font-medium">Epic:</span>
          <select
            value={epicFilter}
            onChange={(e) => setEpicFilter(e.target.value)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Epics</option>
            <option value="none">No Epic</option>
            {epics.map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <span className="text-sm text-text-muted">
          {filteredTickets.length} of {tickets.length} tickets
        </span>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        <h2 className="text-h4">Tickets</h2>

        {loading ? (
          <div className="card text-center py-12">
            <p className="text-text-muted">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-text-muted mb-4">
              {tickets.length === 0 ? 'No tickets found' : 'No tickets match filters'}
            </p>
            {tickets.length === 0 && (
              <button onClick={handleSync} className="btn btn-primary">
                Sync from JIRA
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTickets.map((ticket) => (
              <Link key={ticket.key} to={`/ticket/${ticket.key}`}>
                <TicketCard ticket={ticket} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
