import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '../lib/api'
import type { SharedPipeline } from '../lib/api'

// Step names for display
const STEP_NAMES: Record<number, string> = {
  1: 'Context',
  2: 'Risk Analysis',
  3: 'Planning',
  4: 'Coding',
  5: 'Testing',
  6: 'Documentation',
  7: 'Pull Request',
  8: 'Review',
}

// Status colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-500',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  paused: 'bg-yellow-500',
  skipped: 'bg-gray-400',
}

export default function SharedView() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<SharedPipeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!token) return

    const loadSharedPipeline = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.getSharedPipeline(token)
        setData(response)
        // Auto-expand steps with output
        const withOutput = new Set(
          response.steps
            .filter((s) => s.output)
            .map((s) => s.step_number)
        )
        setExpandedSteps(withOutput)
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('410') || err.message.includes('expired')) {
            setError('This share link has expired.')
          } else if (err.message.includes('404')) {
            setError('Share link not found.')
          } else {
            setError(err.message)
          }
        } else {
          setError('Failed to load shared pipeline')
        }
      } finally {
        setLoading(false)
      }
    }

    loadSharedPipeline()
  }, [token])

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(stepNum)) {
        newSet.delete(stepNum)
      } else {
        newSet.add(stepNum)
      }
      return newSet
    })
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading shared pipeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-error">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-h4 mb-2">Unable to Load</h1>
          <p className="text-text-muted">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { pipeline, steps, ticket, share_info } = data

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-background font-bold text-sm">B</span>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">
                  Shared Pipeline
                </p>
                <h1 className="text-h5">{ticket?.key || pipeline.ticket_key}</h1>
              </div>
            </div>
            <div className="text-right text-xs text-text-muted">
              <p>Shared {formatDate(share_info.created_at)}</p>
              <p>{share_info.view_count} views</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Ticket Info */}
        {ticket && (
          <div className="card mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-primary">{ticket.key}</span>
              <span className="px-2 py-0.5 bg-surface rounded text-xs uppercase">
                {ticket.status}
              </span>
            </div>
            <h2 className="text-h4 mb-2">{ticket.summary}</h2>
            {ticket.description && (
              <p className="text-text-muted text-sm line-clamp-3">
                {ticket.description}
              </p>
            )}
          </div>
        )}

        {/* Pipeline Status */}
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Pipeline Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`w-3 h-3 rounded-full ${
                    STATUS_COLORS[pipeline.status] || 'bg-gray-500'
                  }`}
                />
                <span className="font-semibold capitalize">
                  {pipeline.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Progress</p>
              <p className="font-mono">
                Step {pipeline.current_step} of {steps.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Cost</p>
              <p className="font-mono">
                ${pipeline.total_cost.toFixed(4)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Tokens</p>
              <p className="font-mono">
                {pipeline.total_tokens.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="card"
            >
              <button
                onClick={() => step.output && toggleStep(step.step_number)}
                className="w-full text-left"
                disabled={!step.output}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        STATUS_COLORS[step.status] || 'bg-gray-500'
                      }`}
                    />
                    <span className="font-semibold">
                      {step.step_number}. {STEP_NAMES[step.step_number] || step.step_name}
                    </span>
                    <span className="text-xs text-text-muted capitalize">
                      {step.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {step.tokens_used > 0 && (
                      <span className="text-xs text-text-muted">
                        {step.tokens_used.toLocaleString()} tokens
                      </span>
                    )}
                    {step.cost > 0 && (
                      <span className="text-xs text-text-muted">
                        ${step.cost.toFixed(4)}
                      </span>
                    )}
                    {step.output && (
                      <svg
                        className={`w-4 h-4 text-text-muted transition-transform ${
                          expandedSteps.has(step.step_number) ? 'rotate-180' : ''
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
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Output */}
              {step.output && expandedSteps.has(step.step_number) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <pre className="text-sm text-text-muted whitespace-pre-wrap font-mono bg-surface p-4 rounded-lg overflow-x-auto">
                    {step.output}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-text-muted">
          <p>This is a read-only view of the pipeline.</p>
          <p className="mt-1">
            Powered by{' '}
            <span className="text-primary font-semibold">BiAgent</span>
          </p>
        </div>
      </main>
    </div>
  )
}
