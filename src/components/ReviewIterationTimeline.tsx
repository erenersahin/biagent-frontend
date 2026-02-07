/**
 * ReviewIterationTimeline - Visual timeline of PR review iterations
 */
import { useStore } from '../lib/store'

interface ReviewIterationTimelineProps {
  pipelineId?: string
}

export function ReviewIterationTimeline(_props: ReviewIterationTimelineProps) {
  const { reviewIterations, currentPR } = useStore()

  if (reviewIterations.length === 0 && !currentPR) {
    return null
  }

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Review Timeline
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-dark-600" />

        {/* PR Created event */}
        {currentPR && (
          <TimelineEvent
            icon="🚀"
            title="PR Created"
            subtitle={`#${currentPR.pr_number} on ${currentPR.branch}`}
            timestamp={currentPR.created_at}
          />
        )}

        {/* Iteration events */}
        {reviewIterations.map((iteration) => (
          <TimelineEvent
            key={iteration.id}
            icon={(iteration.comments_addressed ?? 0) > 0 ? '✅' : '💬'}
            title={`Iteration #${iteration.iteration_number}`}
            subtitle={`${iteration.comments_received} comments → ${iteration.comments_addressed} addressed`}
            timestamp={iteration.created_at}
            commitSha={iteration.commit_sha}
          />
        ))}

        {/* PR Approved event */}
        {currentPR?.approved_at && (
          <TimelineEvent
            icon="✨"
            title="PR Approved"
            subtitle={`${currentPR.approval_count} approval(s)`}
            timestamp={currentPR.approved_at}
            highlight="green"
          />
        )}

        {/* PR Merged event */}
        {currentPR?.merged_at && (
          <TimelineEvent
            icon="🎉"
            title="PR Merged"
            timestamp={currentPR.merged_at}
            highlight="purple"
            isLast={true}
          />
        )}
      </div>
    </div>
  )
}

interface TimelineEventProps {
  icon: string
  title: string
  subtitle?: string
  timestamp: string
  commitSha?: string
  highlight?: 'green' | 'purple' | 'yellow'
  isLast?: boolean
}

function TimelineEvent({
  icon,
  title,
  subtitle,
  timestamp,
  commitSha,
  highlight,
  isLast,
}: TimelineEventProps) {
  const highlightColors = {
    green: 'bg-green-500/20 border-green-500/30',
    purple: 'bg-purple-500/20 border-purple-500/30',
    yellow: 'bg-yellow-500/20 border-yellow-500/30',
  }

  const dotColors = {
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
  }

  return (
    <div className={`relative pl-8 pb-4 ${isLast ? '' : ''}`}>
      {/* Dot */}
      <div
        className={`absolute left-1.5 w-3 h-3 rounded-full border-2 border-dark-800 ${
          highlight ? dotColors[highlight] : 'bg-primary'
        }`}
        style={{ top: '0.25rem' }}
      />

      {/* Content */}
      <div
        className={`rounded-lg p-3 ${
          highlight
            ? `${highlightColors[highlight]} border`
            : 'bg-dark-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-white font-medium text-sm">{title}</span>
        </div>
        {subtitle && (
          <p className="text-dark-300 text-xs mt-1">{subtitle}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-dark-400">
          <span>{new Date(timestamp).toLocaleString()}</span>
          {commitSha && (
            <span className="font-mono bg-dark-600 px-1.5 py-0.5 rounded">
              {commitSha.substring(0, 7)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
