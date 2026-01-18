import { create } from 'zustand'
import type { Ticket, Pipeline, PipelineStep, Tab, TicketStats, WSMessage, UserInputRequest } from '../types'
import * as api from './api'
import type { AppConfig, StepEvent as ApiStepEvent } from './api'

// Event types for chronological streaming display (real-time, timestamp is Date.now())
export type StepEvent =
  | { type: 'text'; content: string; timestamp: number }
  | { type: 'tool_call'; tool: string; arguments: object; timestamp: number }

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

  // Worktree state (for user input prompts)
  userInputRequest: UserInputRequest | null
  worktreeStatus: string | null  // 'creating' | 'ready' | etc.

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
  appendToolCallEvent: (step: number, tool: string, args: object) => void
  clearStepEvents: (step: number) => void
  setStepOutputs: (outputs: Record<number, string>) => void
  setCompletedEvents: (stepNum: number, events: ApiStepEvent[]) => void
  setCompletedToolCalls: (stepNum: number, toolCalls: { tool: string; arguments: string }[]) => void
  clearStepOutputs: () => void

  setLoading: (key: keyof StoreState['loading'], value: boolean) => void

  // Worktree actions
  setUserInputRequest: (request: UserInputRequest | null) => void
  setWorktreeStatus: (status: string | null) => void
  clearUserInputRequest: () => void

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

  userInputRequest: null,
  worktreeStatus: null,

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

  appendToolCallEvent: (step, tool, args) => set((state) => {
    const events = state.stepEvents[step] || []
    return {
      stepEvents: {
        ...state.stepEvents,
        [step]: [...events, { type: 'tool_call' as const, tool, arguments: args, timestamp: Date.now() }],
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

  clearStepOutputs: () => set({ stepOutputs: {}, completedEvents: {}, completedToolCalls: {} }),

  setLoading: (key, value) => set((state) => ({
    loading: { ...state.loading, [key]: value },
  })),

  // Worktree actions
  setUserInputRequest: (request) => set({ userInputRequest: request }),
  setWorktreeStatus: (status) => set({ worktreeStatus: status }),
  clearUserInputRequest: () => set({ userInputRequest: null }),

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
      set({
        currentPipeline: pipeline,
        currentSteps: stepsResponse.steps,
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
        // Update pipeline status to running
        set((s) => ({
          currentPipeline: s.currentPipeline
            ? { ...s.currentPipeline, status: 'running' }
            : null,
        }))
        break

      case 'token':
        // Append text to the ordered event stream
        state.appendTextEvent(message.step, message.token)
        break

      case 'step_started':
        // Clear events and outputs for this step when it starts (in case of retry)
        state.clearStepEvents(message.step)
        set((s) => {
          const newOutputs = { ...s.stepOutputs }
          delete newOutputs[message.step]
          return {
            currentSteps: s.currentSteps.map((step) =>
              step.step_number === message.step
                ? { ...step, status: 'running' }
                : step
            ),
            stepOutputs: newOutputs,
          }
        })
        break

      case 'tool_call_started':
        // Append tool call to the ordered event stream
        state.appendToolCallEvent(
          message.step,
          message.tool,
          message.arguments
        )
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

      default:
        break
    }
  },
}))
