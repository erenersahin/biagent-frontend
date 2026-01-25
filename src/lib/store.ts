import { create } from 'zustand'
import type {
  Ticket,
  Pipeline,
  PipelineStep,
  Tab,
  TicketStats,
  WSMessage,
  UserInputRequest,
  CycleType,
  CyclePhase,
  PullRequest,
  ReviewComment,
  ReviewIteration,
  OfflineEvent,
  SubagentActivity,
  SubagentToolCall,
} from '../types'
import * as api from './api'
import type { AppConfig, StepEvent as ApiStepEvent } from './api'

// Event types for chronological streaming display (real-time, timestamp is Date.now())
export type StepEvent =
  | { type: 'text'; content: string; timestamp: number }
  | { type: 'tool_call'; tool: string; tool_use_id?: string; arguments: object; timestamp: number }

// WebSocket connection status
export type WSStatus = 'disconnected' | 'connecting' | 'connected'

interface StoreState {
  // App Config
  appConfig: AppConfig | null

  // Session
  sessionId: string | null
  tabs: Tab[]
  activeTab: string | null

  // Tickets
  tickets: Ticket[]
  ticketStats: TicketStats | null
  lastSynced: string | null

  // Pipeline state (current view)
  currentPipeline: Pipeline | null
  currentSteps: PipelineStep[]
  stepEvents: Record<number, StepEvent[]>  // step_number -> ordered events (text + tool calls) - for running steps
  stepOutputs: Record<number, string>  // step_number -> final output (preserved after completion)
  completedEvents: Record<number, ApiStepEvent[]>  // Chronological events loaded from DB for completed steps
  completedToolCalls: Record<number, { tool: string; arguments: string }[]>  // Fallback: tool calls for old data
  stepSubagentActivities: Record<number, Record<string, SubagentActivity>>  // step_number -> parent_tool_use_id -> SubagentActivity

  // Worktree state (for user input prompts)
  userInputRequest: UserInputRequest | null
  worktreeStatus: string | null  // 'creating' | 'ready' | etc.

  // WebSocket state
  wsStatus: WSStatus

  // Clarification state
  pendingClarification: {
    id: string
    stepNumber: number
    question: string
    options: string[]
    context?: string
  } | null

  // Cycle Types state
  cycleTypes: CycleType[]
  currentCycleType: string | null
  cyclePhases: CyclePhase[]

  // Code Review state
  currentPR: PullRequest | null
  reviewComments: ReviewComment[]
  reviewIterations: ReviewIteration[]

  // Offline Events state
  offlineEvents: OfflineEvent[]
  showOfflineBanner: boolean

  // Loading states
  loading: {
    tickets: boolean
    pipeline: boolean
    session: boolean
  }

  // Actions
  setAppConfig: (config: AppConfig) => void
  setSessionId: (id: string) => void
  setTabs: (tabs: Tab[]) => void
  setActiveTab: (key: string | null) => void
  addTab: (tab: Tab) => void
  removeTab: (tabId: string) => void

  setTickets: (tickets: Ticket[]) => void
  setTicketStats: (stats: TicketStats) => void
  setLastSynced: (time: string) => void

  setCurrentPipeline: (pipeline: Pipeline | null) => void
  setCurrentSteps: (steps: PipelineStep[]) => void
  appendTextEvent: (step: number, text: string) => void
  appendToolCallEvent: (step: number, tool: string, args: object, toolUseId?: string) => void
  clearStepEvents: (step: number) => void
  setStepOutputs: (outputs: Record<number, string>) => void
  setCompletedEvents: (stepNum: number, events: ApiStepEvent[]) => void
  setCompletedToolCalls: (stepNum: number, toolCalls: { tool: string; arguments: string }[]) => void
  clearStepOutputs: () => void
  appendSubagentToolCall: (step: number, parentToolUseId: string, toolCall: SubagentToolCall) => void
  markSubagentCompleted: (step: number, parentToolUseId: string) => void
  clearStepSubagents: (step: number) => void
  setStepSubagentActivities: (activities: Record<number, Record<string, SubagentActivity>>) => void

  setLoading: (key: keyof StoreState['loading'], value: boolean) => void

  // WebSocket actions
  setWsStatus: (status: WSStatus) => void

  // Worktree actions
  setUserInputRequest: (request: UserInputRequest | null) => void
  setWorktreeStatus: (status: string | null) => void
  clearUserInputRequest: () => void

  // Clarification actions
  setPendingClarification: (clarification: StoreState['pendingClarification']) => void
  clearPendingClarification: () => void

  // Cycle Types actions
  setCycleTypes: (types: CycleType[]) => void
  setCurrentCycleType: (cycleType: string | null) => void
  setCyclePhases: (phases: CyclePhase[]) => void
  fetchCycleTypes: () => Promise<void>
  fetchCyclePhases: (cycleType: string) => Promise<void>

  // Code Review actions
  setCurrentPR: (pr: PullRequest | null) => void
  setReviewComments: (comments: ReviewComment[]) => void
  setReviewIterations: (iterations: ReviewIteration[]) => void
  fetchPipelineReviews: (pipelineId: string) => Promise<void>

  // Offline Events actions
  setOfflineEvents: (events: OfflineEvent[]) => void
  addOfflineEvent: (event: OfflineEvent) => void
  setShowOfflineBanner: (show: boolean) => void
  acknowledgeOfflineEvents: (eventIds: string[]) => Promise<void>

  // API actions
  fetchAppConfig: () => Promise<void>
  fetchTickets: () => Promise<void>
  fetchTicketStats: (assignee?: string) => Promise<void>
  fetchPipeline: (pipelineId: string) => Promise<void>
  restoreSession: () => Promise<void>

  // Handle WebSocket messages
  handleWSMessage: (message: WSMessage) => void
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  appConfig: null,

  sessionId: localStorage.getItem('biagent_session_id'),
  tabs: [],
  activeTab: null,

  tickets: [],
  ticketStats: null,
  lastSynced: null,

  currentPipeline: null,
  currentSteps: [],
  stepEvents: {},
  stepOutputs: {},
  completedEvents: {},
  completedToolCalls: {},
  stepSubagentActivities: {},

  userInputRequest: null,
  worktreeStatus: null,

  wsStatus: 'disconnected',

  pendingClarification: null,

  // Cycle Types
  cycleTypes: [],
  currentCycleType: null,
  cyclePhases: [],

  // Code Review
  currentPR: null,
  reviewComments: [],
  reviewIterations: [],

  // Offline Events
  offlineEvents: [],
  showOfflineBanner: false,

  loading: {
    tickets: false,
    pipeline: false,
    session: false,
  },

  // Actions
  setAppConfig: (config) => set({ appConfig: config }),

  setSessionId: (id) => {
    localStorage.setItem('biagent_session_id', id)
    set({ sessionId: id })
  },

  setTabs: (tabs) => set({ tabs }),
  setActiveTab: (key) => set({ activeTab: key }),

  addTab: (tab) => set((state) => ({
    tabs: [...state.tabs, tab],
    activeTab: tab.ticket_key,
  })),

  removeTab: (tabId) => set((state) => {
    const newTabs = state.tabs.filter(t => t.id !== tabId)
    const removedTab = state.tabs.find(t => t.id === tabId)
    let newActiveTab = state.activeTab

    if (removedTab && state.activeTab === removedTab.ticket_key) {
      newActiveTab = newTabs.length > 0 ? newTabs[0].ticket_key : null
    }

    return { tabs: newTabs, activeTab: newActiveTab }
  }),

  setTickets: (tickets) => set({ tickets }),
  setTicketStats: (stats) => set({ ticketStats: stats }),
  setLastSynced: (time) => set({ lastSynced: time }),

  setCurrentPipeline: (pipeline) => set({ currentPipeline: pipeline }),
  setCurrentSteps: (steps) => set({ currentSteps: steps }),

  appendTextEvent: (step, text) => set((state) => {
    const events = state.stepEvents[step] || []
    const lastEvent = events[events.length - 1]

    // Merge consecutive text events for efficiency
    if (lastEvent && lastEvent.type === 'text') {
      const updatedEvents = [...events]
      updatedEvents[updatedEvents.length - 1] = {
        ...lastEvent,
        content: lastEvent.content + text,
      }
      return {
        stepEvents: { ...state.stepEvents, [step]: updatedEvents },
      }
    }

    // Add new text event
    return {
      stepEvents: {
        ...state.stepEvents,
        [step]: [...events, { type: 'text' as const, content: text, timestamp: Date.now() }],
      },
    }
  }),

  appendToolCallEvent: (step, tool, args, toolUseId?: string) => set((state) => {
    const events = state.stepEvents[step] || []
    return {
      stepEvents: {
        ...state.stepEvents,
        [step]: [...events, { type: 'tool_call' as const, tool, tool_use_id: toolUseId, arguments: args, timestamp: Date.now() }],
      },
    }
  }),

  clearStepEvents: (step) => set((state) => {
    const newEvents = { ...state.stepEvents }
    delete newEvents[step]
    return { stepEvents: newEvents }
  }),

  setStepOutputs: (outputs) => set((state) => ({
    stepOutputs: { ...state.stepOutputs, ...outputs }
  })),

  setCompletedEvents: (stepNum, events) => set((state) => ({
    completedEvents: { ...state.completedEvents, [stepNum]: events }
  })),

  setCompletedToolCalls: (stepNum, toolCalls) => set((state) => ({
    completedToolCalls: { ...state.completedToolCalls, [stepNum]: toolCalls }
  })),

  clearStepOutputs: () => set({ stepOutputs: {}, completedEvents: {}, completedToolCalls: {}, stepSubagentActivities: {} }),

  appendSubagentToolCall: (step, parentToolUseId, toolCall) => set((state) => {
    const stepActivities = state.stepSubagentActivities[step] || {}
    const activity = stepActivities[parentToolUseId] || {
      parent_tool_use_id: parentToolUseId,
      tool_calls: [],
      status: 'running' as const,
    }
    return {
      stepSubagentActivities: {
        ...state.stepSubagentActivities,
        [step]: {
          ...stepActivities,
          [parentToolUseId]: {
            ...activity,
            tool_calls: [...activity.tool_calls, toolCall],
          },
        },
      },
    }
  }),

  markSubagentCompleted: (step, parentToolUseId) => set((state) => {
    const stepActivities = state.stepSubagentActivities[step] || {}
    const activity = stepActivities[parentToolUseId]
    if (!activity) return state
    return {
      stepSubagentActivities: {
        ...state.stepSubagentActivities,
        [step]: {
          ...stepActivities,
          [parentToolUseId]: {
            ...activity,
            status: 'completed' as const,
          },
        },
      },
    }
  }),

  clearStepSubagents: (step) => set((state) => {
    const newActivities = { ...state.stepSubagentActivities }
    delete newActivities[step]
    return { stepSubagentActivities: newActivities }
  }),

  setStepSubagentActivities: (activities) => set({ stepSubagentActivities: activities }),

  setLoading: (key, value) => set((state) => ({
    loading: { ...state.loading, [key]: value },
  })),

  // WebSocket actions
  setWsStatus: (status) => set({ wsStatus: status }),

  // Worktree actions
  setUserInputRequest: (request) => set({ userInputRequest: request }),
  setWorktreeStatus: (status) => set({ worktreeStatus: status }),
  clearUserInputRequest: () => set({ userInputRequest: null }),

  // Clarification actions
  setPendingClarification: (clarification) => set({ pendingClarification: clarification }),
  clearPendingClarification: () => set({ pendingClarification: null }),

  // Cycle Types actions
  setCycleTypes: (types) => set({ cycleTypes: types }),
  setCurrentCycleType: (cycleType) => set({ currentCycleType: cycleType }),
  setCyclePhases: (phases) => set({ cyclePhases: phases }),

  fetchCycleTypes: async () => {
    try {
      const types = await api.getCycleTypes()
      set({ cycleTypes: types })
    } catch (error) {
      console.error('Failed to fetch cycle types:', error)
    }
  },

  fetchCyclePhases: async (cycleType: string) => {
    try {
      const phases = await api.getCyclePhases(cycleType)
      set({ cyclePhases: phases, currentCycleType: cycleType })
    } catch (error) {
      console.error('Failed to fetch cycle phases:', error)
    }
  },

  // Code Review actions
  setCurrentPR: (pr) => set({ currentPR: pr }),
  setReviewComments: (comments) => set({ reviewComments: comments }),
  setReviewIterations: (iterations) => set({ reviewIterations: iterations }),

  fetchPipelineReviews: async (pipelineId: string) => {
    try {
      const reviews = await api.getPipelineReviews(pipelineId)
      set({
        reviewComments: reviews.comments,
        reviewIterations: reviews.iterations,
      })
      // Also try to get the PR
      try {
        const pr = await api.getPipelinePR(pipelineId)
        set({ currentPR: pr })
      } catch {
        // PR may not exist yet
        set({ currentPR: null })
      }
    } catch (error) {
      console.error('Failed to fetch pipeline reviews:', error)
    }
  },

  // Offline Events actions
  setOfflineEvents: (events) => set({ offlineEvents: events }),
  addOfflineEvent: (event) => set((state) => ({
    offlineEvents: [...state.offlineEvents, event],
    showOfflineBanner: true,
  })),
  setShowOfflineBanner: (show) => set({ showOfflineBanner: show }),

  acknowledgeOfflineEvents: async (eventIds: string[]) => {
    const sessionId = get().sessionId
    if (!sessionId) return

    try {
      await api.acknowledgeEvents(sessionId, eventIds)
      set((state) => ({
        offlineEvents: state.offlineEvents.filter(e => !eventIds.includes(e.id)),
        showOfflineBanner: state.offlineEvents.filter(e => !eventIds.includes(e.id)).length > 0,
      }))
    } catch (error) {
      console.error('Failed to acknowledge offline events:', error)
    }
  },

  // API actions
  fetchAppConfig: async () => {
    try {
      const config = await api.getAppConfig()
      set({ appConfig: config })
    } catch (error) {
      console.error('Failed to fetch app config:', error)
    }
  },

  fetchTickets: async () => {
    set((state) => ({ loading: { ...state.loading, tickets: true } }))
    try {
      const response = await api.listTickets({ limit: 500 })
      set({
        tickets: response.tickets,
        lastSynced: response.last_synced,
        loading: { ...get().loading, tickets: false },
      })
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      set((state) => ({ loading: { ...state.loading, tickets: false } }))
    }
  },

  fetchTicketStats: async (assignee?: string) => {
    try {
      const stats = await api.getTicketStats(assignee)
      set({ ticketStats: stats })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  },

  fetchPipeline: async (pipelineId) => {
    set((state) => ({ loading: { ...state.loading, pipeline: true } }))
    try {
      const [pipeline, stepsResponse] = await Promise.all([
        api.getPipeline(pipelineId),
        api.getPipelineSteps(pipelineId),
      ])

      // Restore user input request state if pipeline is waiting for input
      let userInputRequest: UserInputRequest | null = null
      let worktreeStatus: string | null = null

      if (pipeline.status === 'needs_user_input' && pipeline.user_input_request) {
        worktreeStatus = pipeline.worktree_status || 'needs_user_input'
        userInputRequest = {
          input_type: 'setup_commands',
          repos: pipeline.user_input_request.repos,
        }
      }

      set({
        currentPipeline: pipeline,
        currentSteps: stepsResponse.steps,
        userInputRequest,
        worktreeStatus,
        loading: { ...get().loading, pipeline: false },
      })
    } catch (error) {
      console.error('Failed to fetch pipeline:', error)
      set((state) => ({ loading: { ...state.loading, pipeline: false } }))
    }
  },

  restoreSession: async () => {
    set((state) => ({ loading: { ...state.loading, session: true } }))
    try {
      const sessionId = get().sessionId
      const session = await api.restoreSession(sessionId || undefined)

      set({
        sessionId: session.session_id,
        tabs: session.tabs,
        activeTab: session.active_tab || null,
        loading: { ...get().loading, session: false },
      })

      localStorage.setItem('biagent_session_id', session.session_id)
    } catch (error) {
      console.error('Failed to restore session:', error)
      set((state) => ({ loading: { ...state.loading, session: false } }))
    }
  },

  // Handle WebSocket messages
  handleWSMessage: (message) => {
    const state = get()

    switch (message.type) {
      case 'pipeline_started':
      case 'pipeline_resumed':
        // Update pipeline status to running and clear worktree state
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'running' }
            : null,
          worktreeStatus: null,
          userInputRequest: null,
        }))
        break

      case 'token':
        // Append text to the ordered event stream
        state.appendTextEvent(message.step, message.token)
        break

      case 'step_started':
        // Clear events, outputs, and subagent activities for this step when it starts (in case of retry)
        state.clearStepEvents(message.step)
        state.clearStepSubagents(message.step)
        set((s) => {
          const newOutputs = { ...s.stepOutputs }
          delete newOutputs[message.step]
          return {
            currentSteps: s.currentSteps.map((step) => {
              if (step.step_number === message.step) {
                // Current step: set to running
                return { ...step, status: 'running', error_message: undefined }
              } else if (step.step_number < message.step && step.status === 'running') {
                // Previous steps that were running: mark as completed
                return { ...step, status: 'completed' }
              }
              return step
            }),
            stepOutputs: newOutputs,
          }
        })
        break

      case 'tool_call_started':
        // Append tool call to the ordered event stream
        state.appendToolCallEvent(
          message.step,
          message.tool,
          message.arguments,
          message.tool_use_id
        )
        break

      case 'subagent_tool_call':
        // Append subagent tool call to activity tracker
        state.appendSubagentToolCall(message.step, message.parent_tool_use_id, {
          tool_use_id: message.tool_use_id,
          tool_name: message.tool_name,
          arguments: message.arguments as Record<string, unknown>,
          timestamp: message.timestamp,
        })
        break

      case 'step_completed':
        // Get streaming events and convert to API format for completedEvents
        const streamingEvents = state.stepEvents[message.step] || []
        const apiFormatEvents: ApiStepEvent[] = streamingEvents.map((e) => {
          if (e.type === 'text') {
            return {
              type: 'text' as const,
              content: e.content,
              timestamp: new Date(e.timestamp).toISOString(),
            }
          } else {
            return {
              type: 'tool_call' as const,
              tool: e.tool,
              arguments: e.arguments,
              timestamp: new Date(e.timestamp).toISOString(),
            }
          }
        })

        // Build final text output (for fallback display)
        const textContent = streamingEvents
          .filter((e): e is { type: 'text'; content: string; timestamp: number } => e.type === 'text')
          .map(e => e.content)
          .join('')

        state.clearStepEvents(message.step)
        set((s) => ({
          currentSteps: s.currentSteps.map((step) =>
            step.step_number === message.step
              ? { ...step, status: 'completed', tokens_used: message.tokens_used || 0, cost: message.cost || 0 }
              : step
          ),
          currentPipeline: s.currentPipeline
            ? {
              ...s.currentPipeline,
              current_step: message.next_step || message.step,  // Stay on current step if no next (last step)
              total_tokens: (s.currentPipeline.total_tokens || 0) + (message.tokens_used || 0),
              total_cost: (s.currentPipeline.total_cost || 0) + (message.cost || 0),
            }
            : null,
          stepOutputs: {
            ...s.stepOutputs,
            [message.step]: textContent || message.output || '',
          },
          // Preserve chronological events for timeline display
          completedEvents: {
            ...s.completedEvents,
            [message.step]: apiFormatEvents,
          },
        }))
        break

      case 'pipeline_completed':
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'completed' }
            : null,
        }))
        break

      case 'pipeline_paused':
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'paused' }
            : null,
          currentSteps: s.currentSteps.map((step) =>
            step.step_number === message.step
              ? { ...step, status: 'paused' }
              : step
          ),
        }))
        break

      case 'pipeline_failed':
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'failed' }
            : null,
          currentSteps: s.currentSteps.map((step) =>
            step.step_number === message.step
              ? { ...step, status: 'failed', error_message: message.error }
              : step
          ),
        }))
        break

      case 'step_skipped':
        set((s) => ({
          currentSteps: s.currentSteps.map((step) => {
            if (step.step_number === message.step) {
              // Skipped step
              return { ...step, status: 'skipped', error_message: `[SKIPPED] ${message.reason}` }
            }
            if (step.step_number === message.next_step) {
              // Next step starts running
              return { ...step, status: 'running' }
            }
            return step
          }),
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, current_step: message.next_step }
            : null,
        }))
        break

      case 'sync_complete':
        state.fetchTickets()
        state.fetchTicketStats()
        break

      case 'ticket_updated':
        state.fetchTickets()
        break

      // Worktree events
      case 'worktree_session_creating':
        set({ worktreeStatus: 'creating' })
        break

      case 'worktree_setup_started':
        set({ worktreeStatus: 'setup' })
        break

      case 'worktree_session_ready':
        set({ worktreeStatus: 'ready', userInputRequest: null })
        break

      case 'pipeline_needs_input':
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'needs_user_input' }
            : null,
          worktreeStatus: 'needs_user_input',
          userInputRequest: {
            input_type: message.input_type as 'setup_commands',
            repos: message.repos,
          },
        }))
        break

      case 'worktree_pr_merged':
        // Could update UI to show merge status
        break

      case 'worktree_session_cleaned':
        set({ worktreeStatus: 'cleaned' })
        break

      // Clarification events
      case 'clarification_requested':
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'waiting_for_review' }
            : null,
          currentSteps: s.currentSteps.map((step) =>
            step.step_number === message.step
              ? { ...step, status: 'waiting' }
              : step
          ),
          pendingClarification: {
            id: message.clarification_id,
            stepNumber: message.step,
            question: message.question,
            options: message.options,
            context: message.context,
          },
        }))
        break

      case 'clarification_answered':
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'running' }
            : null,
          currentSteps: s.currentSteps.map((step) =>
            step.step_number === message.step
              ? { ...step, status: 'running' }
              : step
          ),
          pendingClarification: null,
        }))
        break

      // Code Review events
      case 'waiting_for_review':
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'waiting_for_review' }
            : null,
        }))
        break

      case 'review_received':
        // Refresh review comments when new reviews come in
        if (state.currentPipeline) {
          state.fetchPipelineReviews(state.currentPipeline.id)
        }
        break

      case 'review_responded':
        // Refresh review comments after agent responds
        if (state.currentPipeline) {
          state.fetchPipelineReviews(state.currentPipeline.id)
        }
        break

      case 'pr_approved':
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'completed' }
            : null,
          currentPR: s.currentPR
            ? { ...s.currentPR, status: 'approved' }
            : null,
        }))
        break

      case 'changes_requested':
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'waiting_for_review' }
            : null,
        }))
        // Refresh review comments
        if (state.currentPipeline) {
          state.fetchPipelineReviews(state.currentPipeline.id)
        }
        break

      // Offline Events
      case 'offline_event':
        state.addOfflineEvent({
          id: message.event_id,
          type: message.event_type as OfflineEvent['type'],
          pipeline_id: message.pipeline_id,
          data: message.data as Record<string, unknown>,
          occurred_at: message.occurred_at,
        })
        break

      default:
        break
    }
  },
}))
