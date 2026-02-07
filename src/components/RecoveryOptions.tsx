import { useState } from 'react'
import * as api from '../lib/api'

interface RecoveryOptionsProps {
  pipelineId: string
  stepNumber: number
  stepName: string
  totalSteps?: number  // Used for restart dropdown, defaults to stepNumber
  onClose?: () => void
}

export default function RecoveryOptions({
  pipelineId,
  stepNumber,
  stepName,
  totalSteps: _totalSteps,  // Not currently used, restart goes back to earlier steps
  onClose,
}: RecoveryOptionsProps) {
  const [mode, setMode] = useState<'options' | 'feedback' | 'skip' | 'restart'>('options')
  const [feedback, setFeedback] = useState('')
  const [skipReason, setSkipReason] = useState('')
  const [restartStep, setRestartStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.startPipeline(pipelineId)
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry')
    } finally {
      setLoading(false)
    }
  }

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.provideFeedback(pipelineId, stepNumber, feedback)
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.skipStep(pipelineId, stepNumber, skipReason || undefined)
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip step')
    } finally {
      setLoading(false)
    }
  }

  const handleRestart = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.restartPipeline(pipelineId, restartStep)
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart')
    } finally {
      setLoading(false)
    }
  }

  // Generate step options for restart dropdown
  const stepOptions = Array.from({ length: stepNumber }, (_, i) => i + 1)

  return (
    <div className="bg-bg-reasoning rounded-lg p-4 mt-4 border-2 border-error animate-slideDown">
      <p className="section-label text-error mb-3">/ Recovery Options</p>

      {error && (
        <div className="mb-3 p-2 bg-error/10 border border-error rounded text-error text-sm">
          {error}
        </div>
      )}

      {mode === 'options' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleRetry}
            disabled={loading}
            className="px-4 py-3 rounded-lg border-2 border-primary-dark bg-white hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-medium text-sm mb-1">Retry</p>
            <p className="text-xs text-text-muted">Run this step again</p>
          </button>

          <button
            onClick={() => setMode('feedback')}
            disabled={loading}
            className="px-4 py-3 rounded-lg border-2 border-primary-dark bg-white hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-medium text-sm mb-1">Retry + Feedback</p>
            <p className="text-xs text-text-muted">Provide guidance for retry</p>
          </button>

          <button
            onClick={() => setMode('skip')}
            disabled={loading}
            className="px-4 py-3 rounded-lg border-2 border-primary-dark bg-white hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-medium text-sm mb-1">Skip Step</p>
            <p className="text-xs text-text-muted">Continue to next step</p>
          </button>

          <button
            onClick={() => setMode('restart')}
            disabled={loading}
            className="px-4 py-3 rounded-lg border-2 border-primary-dark bg-white hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
          >
            <p className="font-medium text-sm mb-1">Restart From...</p>
            <p className="text-xs text-text-muted">Go back to earlier step</p>
          </button>
        </div>
      )}

      {mode === 'feedback' && (
        <div className="space-y-3">
          <p className="text-sm text-text-body">
            Provide feedback to help the agent improve on this step:
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="E.g., Try a different approach, focus on X, avoid Y..."
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:border-primary-dark"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setMode('options')}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-body transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleFeedbackSubmit}
              disabled={loading || !feedback.trim()}
              className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Retry with Feedback'}
            </button>
          </div>
        </div>
      )}

      {mode === 'skip' && (
        <div className="space-y-3">
          <p className="text-sm text-text-body">
            Skip "{stepName}" and continue to the next step.
          </p>
          <input
            type="text"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder="Reason for skipping (optional)"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-dark"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setMode('options')}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-body transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSkip}
              disabled={loading}
              className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50"
            >
              {loading ? 'Skipping...' : 'Skip Step'}
            </button>
          </div>
        </div>
      )}

      {mode === 'restart' && (
        <div className="space-y-3">
          <p className="text-sm text-text-body">
            Restart the pipeline from an earlier step:
          </p>
          <select
            value={restartStep}
            onChange={(e) => setRestartStep(parseInt(e.target.value))}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-dark"
          >
            {stepOptions.map((num) => (
              <option key={num} value={num}>
                Step {num}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setMode('options')}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-body transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleRestart}
              disabled={loading}
              className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50"
            >
              {loading ? 'Restarting...' : `Restart from Step ${restartStep}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
