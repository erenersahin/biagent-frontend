import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import * as api from '../lib/api'
import type { Ticket } from '../types'
import StepCard from '../components/StepCard'
import PipelineControls from '../components/PipelineControls'
import UserInputPrompt from '../components/UserInputPrompt'

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

const getJiraStatusStyle = (status?: string) => {
  if (!status) return { bg: 'bg-gray-400', text: 'text-white' }
  const normalized = status.toLowerCase()
  return JIRA_STATUS_COLORS[normalized] || { bg: 'bg-gray-500', text: 'text-white' }
}

export default function TicketDetail() {
  const { ticketKey } = useParams<{ ticketKey: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef<string | null>(null) // Track which ticket is being loaded

  const appConfig = useStore((state) => state.appConfig)
  const currentPipeline = useStore((state) => state.currentPipeline)
  const currentSteps = useStore((state) => state.currentSteps)
  const stepEvents = useStore((state) => state.stepEvents)
  const stepOutputs = useStore((state) => state.stepOutputs)
  const completedEvents = useStore((state) => state.completedEvents)
  const completedToolCalls = useStore((state) => state.completedToolCalls)
  const userInputRequest = useStore((state) => state.userInputRequest)
  const worktreeStatus = useStore((state) => state.worktreeStatus)
  const setCurrentPipeline = useStore((state) => state.setCurrentPipeline)
  const setCurrentSteps = useStore((state) => state.setCurrentSteps)
  const clearStepOutputs = useStore((state) => state.clearStepOutputs)
  const clearUserInputRequest = useStore((state) => state.clearUserInputRequest)
  const setWorktreeStatus = useStore((state) => state.setWorktreeStatus)

  // Get max steps from config (default 8 for backwards compatibility)
  const maxSteps = appConfig?.max_steps ?? 8

  useEffect(() => {
    if (!ticketKey) return

    // Prevent duplicate calls from StrictMode - don't reset in cleanup
    if (loadingRef.current === ticketKey) return
    loadingRef.current = ticketKey

    // Clear previous state when changing tickets
    setCurrentPipeline(null)
    setCurrentSteps([])
    clearStepOutputs()
    clearUserInputRequest()
    setWorktreeStatus(null)

    const loadTicketAndPipeline = async () => {
      setLoading(true)
      setError(null)

      try {
        // Load ticket data
        const ticketData = await api.getTicket(ticketKey)
        setTicket(ticketData)

        // Try to load existing pipeline for this ticket
        try {
          const pipeline = await api.getPipelineByTicket(ticketKey)

          // Fetch steps separately (pipeline already fetched above)
          const stepsResponse = await api.getPipelineSteps(pipeline.id)

          // Restore user input request state if pipeline is waiting for input
          if (pipeline.status === 'needs_user_input' && pipeline.user_input_request) {
            useStore.getState().setWorktreeStatus(pipeline.worktree_status || 'needs_user_input')
            useStore.getState().setUserInputRequest({
              input_type: 'setup_commands',
              repos: pipeline.user_input_request.repos,
            })
          }

          setCurrentPipeline(pipeline)
          setCurrentSteps(stepsResponse.steps)

          // Load step outputs from the database (for any pipeline that has started)
          // This ensures completed steps show their output even while other steps are running
          // Pass running step number so we can load its tool calls into stepEvents
          if (pipeline.status !== 'pending') {
            const runningStep = pipeline.status === 'running' ? pipeline.current_step : undefined
            await loadStepOutputs(pipeline.id, runningStep)
          }
        } catch {
          // No pipeline exists for this ticket yet - that's fine
          setCurrentPipeline(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ticket')
      } finally {
        setLoading(false)
      }
    }

    loadTicketAndPipeline()

    // Don't reset loadingRef on cleanup - this breaks StrictMode protection
  }, [ticketKey, setCurrentPipeline, setCurrentSteps, clearStepOutputs, clearUserInputRequest, setWorktreeStatus])

  // Load step outputs and events from database using batch API
  const loadStepOutputs = async (pipelineId: string, runningStepNum?: number) => {
    const setStepOutputs = useStore.getState().setStepOutputs
    const setCompletedEvents = useStore.getState().setCompletedEvents
    const setCompletedToolCalls = useStore.getState().setCompletedToolCalls
    const appendToolCallEvent = useStore.getState().appendToolCallEvent

    try {
      // Single batch request instead of 8 individual requests
      const response = await api.getAllStepOutputs(pipelineId)
      const outputs: Record<number, string> = {}

      for (const [stepNumStr, stepData] of Object.entries(response.steps)) {
        const stepNum = parseInt(stepNumStr)
        if (stepData.content) {
          outputs[stepNum] = stepData.content
        }

        // For running step: populate stepEvents from tool_calls (they're saved in real-time)
        if (stepNum === runningStepNum && stepData.tool_calls && stepData.tool_calls.length > 0) {
          for (const tc of stepData.tool_calls) {
            appendToolCallEvent(stepNum, tc.tool, JSON.parse(tc.arguments))
          }
        }
        // For completed steps: prefer events (chronological) over tool_calls (fallback)
        else if (stepData.events && stepData.events.length > 0) {
          setCompletedEvents(stepNum, stepData.events)
        } else if (stepData.tool_calls && stepData.tool_calls.length > 0) {
          // Fallback for old data without events
          setCompletedToolCalls(stepNum, stepData.tool_calls.map(tc => ({
            tool: tc.tool,
            arguments: tc.arguments
          })))
        }
      }

      if (Object.keys(outputs).length > 0) {
        setStepOutputs(outputs)
      }
    } catch {
      // Pipeline may not have outputs yet
    }
  }

  const handleCreatePipeline = async () => {
    if (!ticketKey) return

    try {
      const pipeline = await api.createPipeline(ticketKey)
      setCurrentPipeline(pipeline)
      // Fetch steps for the new pipeline
      const stepsResponse = await api.getPipelineSteps(pipeline.id)
      setCurrentSteps(stepsResponse.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pipeline')
    }
  }

  const handleStart = async () => {
    if (!currentPipeline) return

    try {
      await api.startPipeline(currentPipeline.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start pipeline')
    }
  }

  const handlePause = async () => {
    if (!currentPipeline) return

    try {
      await api.pausePipeline(currentPipeline.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause pipeline')
    }
  }

  const handleResume = async () => {
    if (!currentPipeline) return

    try {
      await api.resumePipeline(currentPipeline.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume pipeline')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Loading ticket...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <p className="text-error mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-secondary"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Ticket not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Ticket Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="section-label mb-2">/ Ticket</p>
          <div className="flex items-center gap-4 mb-2">
            <span className="font-mono text-lg text-primary-dark">
              {ticket.key}
            </span>
            {(() => {
              const statusStyle = getJiraStatusStyle(ticket.status)
              return (
                <span className={`px-3 py-1 rounded-pill text-sm font-semibold uppercase ${statusStyle.bg} ${statusStyle.text}`}>
                  {ticket.status}
                </span>
              )
            })()}
          </div>
          <h1 className="text-h3">{ticket.summary}</h1>
        </div>

        {!currentPipeline && (
          <button onClick={handleCreatePipeline} className="btn btn-primary">
            Start Pipeline
          </button>
        )}
      </div>

      {/* Ticket Description */}
      {ticket.description && (
        <div className="card">
          <h3 className="text-h5 mb-3">Description</h3>
          <p className="text-text-body whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>
      )}

      {/* Pipeline Section */}
      {currentPipeline && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label mb-1">/ Pipeline</p>
              <p className="text-sm text-text-muted">
                Step {currentPipeline.current_step} of {maxSteps} &bull;{' '}
                {currentPipeline.total_tokens.toLocaleString()} tokens &bull; $
                {currentPipeline.total_cost.toFixed(4)}
                {worktreeStatus && worktreeStatus !== 'ready' && (
                  <span className="ml-2">
                    &bull; Worktree: <span className="text-primary">{worktreeStatus}</span>
                  </span>
                )}
              </p>
            </div>

            <PipelineControls
              status={currentPipeline.status}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
            />
          </div>

          {/* User Input Prompt (when pipeline needs setup commands) */}
          {currentPipeline.status === 'needs_user_input' && userInputRequest && (
            <UserInputPrompt pipelineId={currentPipeline.id} />
          )}

          {/* Steps */}
          <div className="space-y-4">
            {currentSteps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                pipelineId={currentPipeline.id}
                isActive={step.step_number === currentPipeline.current_step}
                stepEvents={stepEvents[step.step_number] || []}
                completedEvents={completedEvents[step.step_number] || []}
                completedOutput={stepOutputs[step.step_number] || ''}
                completedToolCalls={completedToolCalls[step.step_number] || []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
