/**
 * ReviewCommentsList - Displays PR review comments grouped by iteration
 */
import { useEffect } from 'react'
import { useStore } from '../lib/store'

interface ReviewCommentsListProps {
  pipelineId: string
}

export function ReviewCommentsList({ pipelineId }: ReviewCommentsListProps) {
  const { reviewComments, reviewIterations, fetchPipelineReviews } = useStore()

  useEffect(() => {
    if (pipelineId) {
      fetchPipelineReviews(pipelineId)
    }
  }, [pipelineId, fetchPipelineReviews])

  if (reviewComments.length === 0) {
    return null
  }

  // Group comments by whether they're processed
  const pendingComments = reviewComments.filter((c) => !c.processed)
  const processedComments = reviewComments.filter((c) => c.processed)

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        Review Comments ({reviewComments.length})
      </h3>

      {/* Pending comments */}
      {pendingComments.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-yellow-400 uppercase tracking-wide mb-2">
            Pending ({pendingComments.length})
          </p>
          <div className="space-y-2">
            {pendingComments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        </div>
      )}

      {/* Iterations */}
      {reviewIterations.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-dark-400 uppercase tracking-wide mb-2">
            Review Iterations
          </p>
          <div className="space-y-2">
            {reviewIterations.map((iteration) => (
              <div
                key={iteration.id}
                className="bg-dark-700 rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">
                    Iteration #{iteration.iteration_number}
                  </span>
                  <span className="text-dark-400 text-xs">
                    {new Date(iteration.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-dark-300">
                  <span>{iteration.comments_received} received</span>
                  <span>{iteration.comments_addressed} addressed</span>
                  {iteration.commit_sha && (
                    <span className="font-mono text-dark-400">
                      {iteration.commit_sha.substring(0, 7)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed comments */}
      {processedComments.length > 0 && (
        <div>
          <p className="text-xs text-green-400 uppercase tracking-wide mb-2">
            Addressed ({processedComments.length})
          </p>
          <div className="space-y-2 opacity-75">
            {processedComments.slice(0, 5).map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
            {processedComments.length > 5 && (
              <p className="text-xs text-dark-400 text-center py-2">
                +{processedComments.length - 5} more comments
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface CommentCardProps {
  comment: {
    id: string
    comment_body: string
    file_path?: string
    line_number?: number
    reviewer?: string
    review_state?: string
    processed: boolean
  }
}

function CommentCard({ comment }: CommentCardProps) {
  const stateColors: Record<string, string> = {
    comment: 'border-blue-500/30',
    changes_requested: 'border-orange-500/30',
    approved: 'border-green-500/30',
  }

  return (
    <div
      className={`bg-dark-700 rounded-lg p-3 border-l-2 ${
        comment.review_state ? (stateColors[comment.review_state] || 'border-dark-500') : 'border-dark-500'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-primary">
          @{comment.reviewer || 'unknown'}
        </span>
        {comment.processed && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Addressed
          </span>
        )}
      </div>
      {comment.file_path && (
        <p className="text-xs text-dark-400 font-mono mb-1">
          {comment.file_path}
          {comment.line_number && `:${comment.line_number}`}
        </p>
      )}
      <p className="text-sm text-dark-200 whitespace-pre-wrap">
        {comment.comment_body.length > 200
          ? comment.comment_body.substring(0, 200) + '...'
          : comment.comment_body}
      </p>
    </div>
  )
}
