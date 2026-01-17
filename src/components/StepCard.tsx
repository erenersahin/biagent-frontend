import { useState } from 'react'
import type { PipelineStep } from '../types'
import * as api from '../lib/api'

interface ToolCall {
  tool: string
  arguments: object
  timestamp: number
}

interface StepCardProps {
  step: PipelineStep
  pipelineId: string
  isActive: boolean
  streamingTokens: string
  completedOutput?: string
  toolCalls?: ToolCall[]
}

export default function StepCard({
  step,
  pipelineId,
  isActive,
  streamingTokens,
  completedOutput = '',
  toolCalls = [],
}: StepCardProps) {
  const [expanded, setExpanded] = useState(isActive)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const getStatusClass = () => {
    switch (step.status) {
      case 'completed':
        return 'step-card--completed'
      case 'running':
        return 'step-card--running'
      case 'failed':
        return 'step-card--failed'
      case 'paused':
        return 'step-card--paused'
      default:
        return 'step-card--pending'
    }
  }

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'running':
        return <div className="status-dot status-dot--running animate-pulse" />
      case 'failed':
        return (
          <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'paused':
        return <div className="status-dot status-dot--paused" />
      default:
        return <div className="status-dot status-dot--pending" />
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return

    setSubmitting(true)
    try {
      await api.provideFeedback(pipelineId, step.step_number, feedback)
      setFeedbackOpen(false)
      setFeedback('')
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`step-card ${getStatusClass()}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <span className="font-mono text-sm text-text-muted">
              Step {step.step_number}
            </span>
            <h4 className="text-h5">{step.step_name}</h4>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {step.tokens_used > 0 && (
            <span className="text-sm text-text-muted">
              {step.tokens_used.toLocaleString()} tokens &bull; $
              {step.cost.toFixed(4)}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-text-muted transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Tool Calls */}
          {toolCalls.length > 0 && step.status === 'running' && (
            <div className="mb-3 space-y-2">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Tool Calls</span>
              <div className="flex flex-wrap gap-2">
                {toolCalls.map((tc, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                  >
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="font-mono text-blue-700">{tc.tool}</span>
                    {tc.arguments && Object.keys(tc.arguments).length > 0 && (
                      <span className="text-blue-500 text-xs truncate max-w-[200px]">
                        {JSON.stringify(tc.arguments).slice(0, 50)}...
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streaming Output (during running) */}
          {step.status === 'running' && (
            <div className="reasoning-block">
              <p className="whitespace-pre-wrap">
                {streamingTokens}
                <span className="streaming-cursor" />
              </p>
            </div>
          )}

          {/* Completed Output (after completion) */}
          {step.status === 'completed' && completedOutput && (
            <div className="reasoning-block bg-green-50 border-green-200">
              <p className="whitespace-pre-wrap text-sm">{completedOutput}</p>
            </div>
          )}

          {/* Show placeholder if completed but no output */}
          {step.status === 'completed' && !completedOutput && (
            <div className="text-sm text-text-muted italic">
              Step completed successfully. Output not captured during streaming.
            </div>
          )}

          {/* Error Message */}
          {step.error_message && (
            <div className="bg-red-50 border border-error rounded-lg p-4">
              <p className="text-error text-sm font-mono">
                {step.error_message}
              </p>
            </div>
          )}

          {/* Actions */}
          {(step.status === 'completed' || step.status === 'failed') && (
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFeedbackOpen(!feedbackOpen)
                }}
                className="btn btn-secondary text-sm py-2 px-4"
              >
                Provide Feedback
              </button>
            </div>
          )}

          {/* Feedback Form */}
          {feedbackOpen && (
            <div className="border-t border-border-light pt-4 mt-4">
              <label className="block text-sm font-medium text-text-heading mb-2">
                What should the agent do differently?
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe the changes you want..."
                className="w-full p-3 border-2 border-border-primary rounded-lg font-sans text-sm resize-none"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setFeedbackOpen(false)}
                  className="text-sm text-text-muted hover:text-text-body"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedback.trim() || submitting}
                  className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
