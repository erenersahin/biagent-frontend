import type { Ticket } from '../types'

interface TicketCardProps {
  ticket: Ticket
}

// JIRA status colors based on board
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

export default function TicketCard({ ticket }: TicketCardProps) {
  const getPipelineStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success'
      case 'running':
        return 'bg-primary animate-pulse'
      case 'paused':
        return 'bg-warning'
      case 'failed':
        return 'bg-error'
      default:
        return 'bg-pending'
    }
  }

  const getJiraStatusStyle = (status?: string) => {
    if (!status) return { bg: 'bg-gray-400', text: 'text-white' }
    const normalized = status.toLowerCase()
    return JIRA_STATUS_COLORS[normalized] || { bg: 'bg-gray-500', text: 'text-white' }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'highest':
      case 'blocker':
        return 'text-error'
      case 'high':
        return 'text-warning'
      default:
        return 'text-text-muted'
    }
  }

  const statusStyle = getJiraStatusStyle(ticket.status)

  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sm text-primary-dark font-medium">
              {ticket.key}
            </span>
            {ticket.pipeline_status && (
              <>
                <span className={`w-2 h-2 rounded-full ${getPipelineStatusColor(ticket.pipeline_status)}`} />
                <span className="text-xs uppercase font-mono text-text-muted">
                  {ticket.pipeline_status}
                </span>
              </>
            )}
          </div>

          <h3 className="text-h5 mb-2 group-hover:text-primary-dark truncate">
            {ticket.summary}
          </h3>

          <div className="flex items-center gap-4 text-sm text-text-muted flex-wrap">
            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${statusStyle.bg} ${statusStyle.text}`}>
              {ticket.status}
            </span>
            {ticket.epic_name && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                {ticket.epic_name}
              </span>
            )}
            {ticket.priority && (
              <span className={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </span>
            )}
            {ticket.assignee && <span>{ticket.assignee}</span>}
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl text-text-muted group-hover:text-primary-dark transition-colors">
            &rarr;
          </span>
        </div>
      </div>
    </div>
  )
}
