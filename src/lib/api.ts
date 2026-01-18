import type { Ticket, Pipeline, PipelineStep, Session, TicketStats, StepOutput, Tab } from '../types'

const API_BASE = '/api'

// Auth token getter function - set by useAuth hook
let getAuthToken: (() => Promise<string | null>) | null = null
let currentOrgId: string | null = null

/**
 * Set the auth token getter function.
 * Called by the auth store when Clerk is initialized.
 */
export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  getAuthToken = getter
}

/**
 * Set the current organization ID for multi-tenant requests.
 */
export function setCurrentOrgId(orgId: string | null) {
  currentOrgId = orgId
}

/**
 * Build headers with auth token and org context.
 */
async function buildHeaders(additionalHeaders?: HeadersInit): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add auth token if available
  if (getAuthToken) {
    const token = await getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // Add org context if available
  if (currentOrgId) {
    headers['x-clerk-org-id'] = currentOrgId
  }

  // Merge with additional headers
  if (additionalHeaders) {
    const additional = additionalHeaders instanceof Headers
      ? Object.fromEntries(additionalHeaders.entries())
      : additionalHeaders as Record<string, string>
    Object.assign(headers, additional)
  }

  return headers
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = await buildHeaders(options?.headers)

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
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

// Auth API
export interface AuthStatus {
  authenticated: boolean
  user: {
    id: string
    clerk_user_id: string
    email: string
    name: string | null
    organizations: Array<{
      id: string
      clerk_org_id: string
      name: string
      slug: string
      role: string
    }>
    current_org: {
      id: string
      clerk_org_id: string
      name: string
      slug: string
      role: string
    } | null
  } | null
  auth_enabled: boolean
  tier: 'consumer' | 'starter' | 'growth' | 'enterprise'
}

export async function getAuthStatus() {
  return fetchJson<AuthStatus>('/auth/status')
}

export async function getHealth() {
  return fetchJson<{
    status: string
    database: string
    tier: string
    auth_enabled: boolean
    jira_configured: boolean
    github_configured: boolean
    anthropic_configured: boolean
  }>('/health')
}
