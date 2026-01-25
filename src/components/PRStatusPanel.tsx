/**
 * PRStatusPanel - Displays PR status, approval count, and quick actions
 */
import { useStore } from '../lib/store'

interface PRStatusPanelProps {
  pipelineId?: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  merged: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  closed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  approved: 'Approved',
  merged: 'Merged',
  closed: 'Closed',
}

export function PRStatusPanel(_props: PRStatusPanelProps) {
  const { currentPR, currentPipeline } = useStore()

  // Don't show if no PR or pipeline not at PR step
  if (!currentPR && currentPipeline?.current_step !== 7) {
    return null
  }

  // Waiting for PR to be created
  if (!currentPR) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-dark-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div>
            <p className="text-dark-300 text-sm">Creating pull request...</p>
          </div>
        </div>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[currentPR.status] || STATUS_COLORS.open
  const statusLabel = STATUS_LABELS[currentPR.status] || currentPR.status

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <a
              href={currentPR.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium hover:text-primary transition-colors"
            >
              PR #{currentPR.pr_number}
            </a>
            <p className="text-dark-400 text-xs">{currentPR.branch}</p>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Approval count */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-dark-300">
            {currentPR.approval_count} approval{currentPR.approval_count !== 1 ? 's' : ''}
          </span>
        </div>

        <a
          href={currentPR.pr_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline ml-auto"
        >
          View on GitHub →
        </a>
      </div>

      {/* Timestamps */}
      {(currentPR.approved_at || currentPR.merged_at) && (
        <div className="mt-3 pt-3 border-t border-dark-600 text-xs text-dark-400">
          {currentPR.approved_at && (
            <p>Approved: {new Date(currentPR.approved_at).toLocaleString()}</p>
          )}
          {currentPR.merged_at && (
            <p>Merged: {new Date(currentPR.merged_at).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  )
}
