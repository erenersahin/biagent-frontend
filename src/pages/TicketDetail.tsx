import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import * as api from '../lib/api'
import type { Ticket } from '../types'
import StepCard from '../components/StepCard'
import PipelineControls from '../components/PipelineControls'
import UserInputPrompt from '../components/UserInputPrompt'
import ClarificationPrompt from '../components/ClarificationPrompt'
import ShareButton from '../components/ShareButton'
import TicketDescription from '../components/TicketDescription'

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
  const stepSubagentActivities = useStore((state) => state.stepSubagentActivities)
  const userInputRequest = useStore((state) => state.userInputRequest)
  const worktreeStatus = useStore((state) => state.worktreeStatus)
  const pendingClarification = useStore((state) => state.pendingClarification)
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
    const setStepSubagentActivities = useStore.getState().setStepSubagentActivities

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
            appendToolCallEvent(stepNum, tc.tool, JSON.parse(tc.arguments), tc.tool_use_id)
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

    // Load subagent tool calls for real-time activity display
    try {
      const subagentToolCalls = await api.getPipelineSubagentToolCalls(pipelineId)

      // Group by step_number -> parent_tool_use_id
      const grouped: Record<number, Record<string, import('../types').SubagentActivity>> = {}
      for (const tc of subagentToolCalls) {
        if (!grouped[tc.step_number]) grouped[tc.step_number] = {}
        if (!grouped[tc.step_number][tc.parent_tool_use_id]) {
          grouped[tc.step_number][tc.parent_tool_use_id] = {
            parent_tool_use_id: tc.parent_tool_use_id,
            events: [],
            tool_calls: [],
            status: 'completed',  // Already done if loading from API
          }
        }
        // Add to both events (chronological) and tool_calls (backwards compat)
        const toolCallEvent = {
          type: 'tool_call' as const,
          timestamp: tc.created_at,
          tool_use_id: tc.tool_use_id,
          tool_name: tc.tool_name,
          arguments: tc.arguments,
        }
        grouped[tc.step_number][tc.parent_tool_use_id].events.push(toolCallEvent)
        grouped[tc.step_number][tc.parent_tool_use_id].tool_calls.push({
          tool_use_id: tc.tool_use_id,
          tool_name: tc.tool_name,
          arguments: tc.arguments,
          timestamp: tc.created_at,
        })
      }

      // Set in store
      if (Object.keys(grouped).length > 0) {
        setStepSubagentActivities(grouped)
      }
    } catch {
      // No subagent tool calls or error - ignore
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

      {/* Ticket Description with Attachments */}
      <TicketDescription ticket={ticket} />

      {/* Pipeline Section */}
      {currentPipeline && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label mb-1">/ Pipeline</p>
              <div className="flex items-center gap-4 text-sm text-text-muted">
                {/* Progress */}
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Step {currentPipeline.current_step}/{maxSteps}
                </span>
                {/* Tokens */}
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {currentPipeline.total_tokens.toLocaleString()} tokens
                </span>
                {/* Cost */}
                <span className="flex items-center gap-1 font-mono">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ${currentPipeline.total_cost.toFixed(4)}
                </span>
                {/* Worktree status */}
                {worktreeStatus && worktreeStatus !== 'ready' && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="text-primary">{worktreeStatus}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShareButton pipelineId={currentPipeline.id} />
              <PipelineControls
                status={currentPipeline.status}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
              />
            </div>
          </div>

          {/* User Input Prompt (when pipeline needs setup commands) */}
          {currentPipeline.status === 'needs_user_input' && userInputRequest && (
            <UserInputPrompt pipelineId={currentPipeline.id} />
          )}

          {/* Clarification Prompt (when agent needs clarification) */}
          {currentPipeline.status === 'waiting_for_review' && pendingClarification && (
            <ClarificationPrompt pipelineId={currentPipeline.id} />
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
                totalSteps={maxSteps}
                subagentActivities={stepSubagentActivities[step.step_number] || {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
