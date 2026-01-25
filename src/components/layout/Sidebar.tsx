import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../lib/store'
import type { Ticket, PipelineStatus } from '../../types'

// JIRA status colors
const JIRA_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'to do': { bg: 'bg-gray-500', text: 'text-white' },
  'blocked': { bg: 'bg-red-600', text: 'text-white' },
  'in progress': { bg: 'bg-blue-600', text: 'text-white' },
  'review': { bg: 'bg-amber-500', text: 'text-black' },
  'merged to development': { bg: 'bg-cyan-600', text: 'text-white' },
  'deployed to test': { bg: 'bg-purple-600', text: 'text-white' },
  'ready to release': { bg: 'bg-emerald-600', text: 'text-white' },
  'done': { bg: 'bg-green-600', text: 'text-white' },
}

const PIPELINE_STATUS_OPTIONS: { value: PipelineStatus | 'all' | 'none'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'none', label: 'No Pipeline' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
]

interface SidebarProps {
  className?: string
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // Store selectors
  const tickets = useStore((state) => state.tickets)
  const loading = useStore((state) => state.loading.tickets)
  const appConfig = useStore((state) => state.appConfig)
  const fetchTickets = useStore((state) => state.fetchTickets)
  const fetchAppConfig = useStore((state) => state.fetchAppConfig)
  const initialLoadDone = useRef(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [pipelineFilter, setPipelineFilter] = useState<PipelineStatus | 'all' | 'none'>('all')
  const [jiraStatusFilter, setJiraStatusFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')

  // Get current active ticket from URL
  const activeTicketKey = useMemo(() => {
    const match = location.pathname.match(/\/ticket\/(.+)/)
    return match ? match[1] : null
  }, [location.pathname])

  // Fetch data on mount
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    fetchAppConfig()
  }, [fetchAppConfig])

  useEffect(() => {
    if (!initialLoadDone.current) return
    fetchTickets()
  }, [fetchTickets])

  // Extract unique JIRA statuses
  const jiraStatuses = useMemo(() => {
    const statusSet = new Set<string>()
    tickets.forEach((ticket) => {
      if (ticket.status) {
        statusSet.add(ticket.status)
      }
    })
    return Array.from(statusSet).sort()
  }, [tickets])

  // Extract unique assignees
  const assignees = useMemo(() => {
    const assigneeSet = new Set<string>()
    tickets.forEach((ticket) => {
      if (ticket.assignee) {
        assigneeSet.add(ticket.assignee)
      }
    })
    return Array.from(assigneeSet).sort()
  }, [tickets])

  // Auto-select current user as assignee filter if configured
  useEffect(() => {
    if (appConfig?.developer_name && assigneeFilter === 'all') {
      // Check if developer is in the assignees list
      const developerInList = assignees.some(
        a => a.toLowerCase() === appConfig.developer_name?.toLowerCase()
      )
      if (developerInList) {
        setAssigneeFilter(appConfig.developer_name)
      }
    }
  }, [appConfig, assignees, assigneeFilter])

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesKey = ticket.key.toLowerCase().includes(query)
        const matchesSummary = ticket.summary.toLowerCase().includes(query)
        if (!matchesKey && !matchesSummary) {
          return false
        }
      }

      // Pipeline status filter
      if (pipelineFilter !== 'all') {
        if (pipelineFilter === 'none') {
          if (ticket.pipeline_status) return false
        } else {
          if (ticket.pipeline_status !== pipelineFilter) return false
        }
      }

      // JIRA status filter
      if (jiraStatusFilter !== 'all') {
        if (ticket.status.toLowerCase() !== jiraStatusFilter.toLowerCase()) {
          return false
        }
      }

      // Assignee filter
      if (assigneeFilter !== 'all') {
        if (!ticket.assignee || ticket.assignee.toLowerCase() !== assigneeFilter.toLowerCase()) {
          return false
        }
      }

      return true
    })
  }, [tickets, searchQuery, pipelineFilter, jiraStatusFilter, assigneeFilter])

  // Get pipeline status indicator
  const getPipelineIndicator = (status?: PipelineStatus) => {
    if (!status) return null

    const colors: Record<PipelineStatus, string> = {
      pending: 'bg-pending',
      running: 'bg-primary animate-pulse',
      paused: 'bg-warning',
      completed: 'bg-success',
      failed: 'bg-error',
      waiting_for_review: 'bg-info',
      suspended: 'bg-pending',
      needs_user_input: 'bg-info',
    }

    return (
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || 'bg-pending'}`}
        title={status}
      />
    )
  }

  // Get JIRA status style
  const getJiraStatusStyle = (status?: string) => {
    if (!status) return { bg: 'bg-gray-400', text: 'text-white' }
    const normalized = status.toLowerCase()
    return JIRA_STATUS_COLORS[normalized] || { bg: 'bg-gray-500', text: 'text-white' }
  }

  const handleTicketClick = (ticket: Ticket) => {
    navigate(`/ticket/${ticket.key}`)
  }

  return (
    <aside
      className={`w-[280px] h-full bg-bg-card border-r-2 border-primary-dark flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        {appConfig?.developer_name && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-background text-xs font-bold">
                {appConfig.developer_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-text-heading truncate">
              {appConfig.developer_name}
            </span>
          </div>
        )}
        <p className="section-label mb-1">/ Tickets</p>
        <p className="text-sm text-text-muted">
          {filteredTickets.length} of {tickets.length}
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-text-body placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        {/* Pipeline Status Filter */}
        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">
            Pipeline
          </label>
          <select
            value={pipelineFilter}
            onChange={(e) => setPipelineFilter(e.target.value as PipelineStatus | 'all' | 'none')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {PIPELINE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* JIRA Status Filter */}
        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">
            JIRA Status
          </label>
          <select
            value={jiraStatusFilter}
            onChange={(e) => setJiraStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            {jiraStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">
            Assignee
          </label>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-text-body focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Assignees</option>
            {appConfig?.developer_name && (
              <option value={appConfig.developer_name}>
                Me ({appConfig.developer_name})
              </option>
            )}
            {assignees
              .filter(a => a !== appConfig?.developer_name)
              .map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-text-muted text-sm">
            Loading tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-4 text-center text-text-muted text-sm">
            {tickets.length === 0 ? 'No tickets found' : 'No matches'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTickets.map((ticket) => {
              const isActive = ticket.key === activeTicketKey
              const statusStyle = getJiraStatusStyle(ticket.status)

              return (
                <button
                  key={ticket.key}
                  onClick={() => handleTicketClick(ticket)}
                  className={`w-full text-left p-4 transition-colors hover:bg-gray-50 ${
                    isActive ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Pipeline status indicator */}
                    {getPipelineIndicator(ticket.pipeline_status)}

                    <div className="flex-1 min-w-0">
                      {/* Ticket key */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono text-xs font-medium ${isActive ? 'text-primary-dark' : 'text-text-muted'}`}>
                          {ticket.key}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${statusStyle.bg} ${statusStyle.text}`}>
                          {ticket.status.split(' ').slice(0, 2).join(' ')}
                        </span>
                      </div>

                      {/* Ticket summary */}
                      <p className={`text-sm mt-1 line-clamp-2 ${isActive ? 'text-text-heading font-medium' : 'text-text-body'}`}>
                        {ticket.summary}
                      </p>

                      {/* Pipeline status text */}
                      {ticket.pipeline_status && (
                        <span className="text-[10px] font-mono uppercase text-text-muted mt-1 block">
                          {ticket.pipeline_status}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
