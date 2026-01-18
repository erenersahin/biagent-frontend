import type { Ticket, Pipeline, PipelineStep, Session, TicketStats, StepOutput, Tab } from '../types'

const API_BASE = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

// App Config API
export interface AppConfig {
  developer_name: string | null
  jira_project_key: string | null
  max_steps: number  // Number of pipeline steps enabled (1-8)
}

export async function getAppConfig() {
  return fetchJson<AppConfig>('/tickets/config')
}

// Tickets API
export async function listTickets(params?: { status?: string; assignee?: string; limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.assignee) searchParams.set('assignee', params.assignee)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  return fetchJson<{ tickets: Ticket[]; total: number; last_synced?: string }>(
    `/tickets?${searchParams}`
  )
}

export async function getTicket(ticketKey: string) {
  return fetchJson<Ticket>(`/tickets/${ticketKey}`)
}

export async function getTicketStats(assignee?: string) {
  const params = assignee ? `?assignee=${encodeURIComponent(assignee)}` : ''
  return fetchJson<TicketStats>(`/tickets/stats${params}`)
}

export async function getRelatedTickets(ticketKey: string) {
  return fetchJson<{ related: Ticket[] }>(`/tickets/${ticketKey}/related`)
}

export async function triggerSync() {
  return fetchJson<{ status: string; tickets_updated: number }>('/tickets/sync', {
    method: 'POST',
  })
}

// Pipelines API
export async function createPipeline(ticketKey: string) {
  return fetchJson<Pipeline>('/pipelines', {
    method: 'POST',
    body: JSON.stringify({ ticket_key: ticketKey }),
  })
}

export async function getPipeline(pipelineId: string) {
  return fetchJson<Pipeline>(`/pipelines/${pipelineId}`)
}

export async function getPipelineByTicket(ticketKey: string) {
  return fetchJson<Pipeline>(`/pipelines/by-ticket/${ticketKey}`)
}

export async function startPipeline(pipelineId: string) {
  return fetchJson<{ status: string; pipeline_id: string }>(`/pipelines/${pipelineId}/start`, {
    method: 'POST',
  })
}

export async function pausePipeline(pipelineId: string) {
  return fetchJson<{ status: string; pipeline_id: string }>(`/pipelines/${pipelineId}/pause`, {
    method: 'POST',
  })
}

export async function resumePipeline(pipelineId: string) {
  return fetchJson<{ status: string; pipeline_id: string }>(`/pipelines/${pipelineId}/resume`, {
    method: 'POST',
  })
}

export async function restartPipeline(pipelineId: string, fromStep: number, guidance?: string) {
  return fetchJson<{ status: string; pipeline_id: string; from_step: number }>(
    `/pipelines/${pipelineId}/restart`,
    {
      method: 'POST',
      body: JSON.stringify({ from_step: fromStep, guidance }),
    }
  )
}

export async function getPipelineSteps(pipelineId: string) {
  return fetchJson<{ steps: PipelineStep[] }>(`/pipelines/${pipelineId}/steps`)
}

export interface StepToolCall {
  tool: string
  arguments: string
  timestamp: string
}

export interface StepEvent {
  type: 'text' | 'tool_call'
  content?: string  // For text events
  tool?: string     // For tool_call events
  arguments?: object
  timestamp?: string  // ISO timestamp
}

export interface AllStepOutputs {
  steps: Record<number, {
    content: string
    events: StepEvent[]      // Chronological events (new format)
    tool_calls: StepToolCall[] // Fallback for old data
  }>
}

export async function getAllStepOutputs(pipelineId: string) {
  return fetchJson<AllStepOutputs>(`/pipelines/${pipelineId}/outputs`)
}

export async function getStepOutput(pipelineId: string, stepNumber: number) {
  return fetchJson<{
    outputs: StepOutput[]
    tool_calls: StepToolCall[]
  }>(
    `/pipelines/${pipelineId}/steps/${stepNumber}/output`
  )
}

export async function provideFeedback(pipelineId: string, stepNumber: number, feedback: string) {
  return fetchJson<{ status: string; step: number; with_feedback: boolean }>(
    `/pipelines/${pipelineId}/steps/${stepNumber}/feedback`,
    {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }
  )
}

export async function getStepHistory(pipelineId: string, stepNumber: number) {
  return fetchJson<{ history: object[] }>(`/pipelines/${pipelineId}/steps/${stepNumber}/history`)
}

export async function provideUserInput(
  pipelineId: string,
  inputType: string,
  data: Record<string, string[]>
) {
  return fetchJson<{ status: string; pipeline_id: string; input_type: string; message: string }>(
    `/pipelines/${pipelineId}/provide-input`,
    {
      method: 'POST',
      body: JSON.stringify({ input_type: inputType, data }),
    }
  )
}

// Session API
export async function restoreSession(sessionId?: string) {
  const url = sessionId ? `/session/restore?session_id=${sessionId}` : '/session/restore'
  return fetchJson<Session>(url)
}

export async function listTabs(sessionId: string) {
  return fetchJson<{ tabs: Tab[] }>(`/session/tabs?session_id=${sessionId}`)
}

export async function openTab(sessionId: string, ticketKey: string) {
  return fetchJson<{ tab: Tab; already_open: boolean }>(`/session/tabs?session_id=${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ ticket_key: ticketKey }),
  })
}

export async function closeTab(sessionId: string, tabId: string) {
  return fetchJson<{ status: string }>(`/session/tabs/${tabId}?session_id=${sessionId}`, {
    method: 'DELETE',
  })
}

export async function updateUIState(
  sessionId: string,
  state: { active_tab?: string; scroll_positions?: object; expanded_panels?: string[] }
) {
  return fetchJson<{ status: string }>(`/session/ui-state?session_id=${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(state),
  })
}

export async function acknowledgeEvents(sessionId: string, eventIds: string[]) {
  return fetchJson<{ status: string; count: number }>(
    `/session/acknowledge-events?session_id=${sessionId}`,
    {
      method: 'POST',
      body: JSON.stringify(eventIds),
    }
  )
}
