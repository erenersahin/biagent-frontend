/**
 * OfflineEventBanner - Shows missed events that occurred while user was away
 */
import { useStore } from '../lib/store'
import type { OfflineEvent } from '../types'

const EVENT_MESSAGES: Record<string, (data?: any) => string> = {
  step_completed: (data) => `Step ${data?.step || '?'} completed`,
  pipeline_completed: () => 'Pipeline completed successfully',
  pipeline_failed: (data) => `Pipeline failed: ${data?.error || 'Unknown error'}`,
  pipeline_paused: () => 'Pipeline was paused',
  pr_approved: (data) => `PR approved by ${data?.approved_by || 'reviewer'}`,
  changes_requested: (data) => `Changes requested by ${data?.reviewer || 'reviewer'}`,
  review_received: (data) => `${data?.comments?.length || 1} new review comment(s)`,
  waiting_for_review: () => 'Pipeline is waiting for PR review',
}

const EVENT_ICONS: Record<string, string> = {
  step_completed: '✓',
  pipeline_completed: '🎉',
  pipeline_failed: '❌',
  pipeline_paused: '⏸',
  pr_approved: '✅',
  changes_requested: '📝',
  review_received: '💬',
  waiting_for_review: '⏳',
}

export function OfflineEventBanner() {
  const { offlineEvents, showOfflineBanner, setShowOfflineBanner, acknowledgeOfflineEvents } =
    useStore()

  if (!showOfflineBanner || offlineEvents.length === 0) {
    return null
  }

  const handleDismiss = () => {
    const eventIds = offlineEvents.map((e) => e.id)
    acknowledgeOfflineEvents(eventIds)
  }

  const handleMinimize = () => {
    setShowOfflineBanner(false)
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm z-50 animate-slideUp">
      <div className="bg-dark-800 border border-primary/30 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary">📬</span>
            <span className="text-sm font-medium text-white">
              {offlineEvents.length} event{offlineEvents.length !== 1 ? 's' : ''} while you were away
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className="p-1 text-dark-400 hover:text-white transition-colors"
              title="Minimize"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
              </svg>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-dark-400 hover:text-white transition-colors"
              title="Dismiss all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Events list */}
        <div className="max-h-64 overflow-y-auto">
          {offlineEvents.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-dark-700 border-t border-dark-600">
          <button
            onClick={handleDismiss}
            className="w-full text-sm text-primary hover:underline"
          >
            Mark all as read
          </button>
        </div>
      </div>
    </div>
  )
}

function EventItem({ event }: { event: OfflineEvent }) {
  const getMessage = EVENT_MESSAGES[event.type]
  const icon = EVENT_ICONS[event.type] || '📌'
  const message = getMessage ? getMessage(event.data) : event.type

  return (
    <div className="px-4 py-3 border-b border-dark-700 last:border-b-0 hover:bg-dark-700/50 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">{message}</p>
          <p className="text-xs text-dark-400 mt-1">
            {formatRelativeTime(event.occurred_at)}
          </p>
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
