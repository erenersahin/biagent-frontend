import type {
  Ticket,
  Pipeline,
  PipelineStep,
  Session,
  TicketStats,
  StepOutput,
  Tab,
  CycleType,
  CyclePhase,
  CycleTypeWithPhases,
  PullRequest,
  ReviewComment,
  ReviewIteration,
} from '../types'

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
  tool_use_id?: string  // SDK tool_use_id for linking subagent calls
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

export async function skipStep(pipelineId: string, stepNumber: number, reason?: string) {
  return fetchJson<{
    status: string
    pipeline_id: string
    step: number
    reason: string
    pipeline_status: string
    next_step: number | null
  }>(
    `/pipelines/${pipelineId}/steps/${stepNumber}/skip`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
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

// Clarifications API
export interface Clarification {
  id: string
  step_id: string
  pipeline_id: string
  question: string
  options: string[]
  selected_option?: number | null
  custom_answer?: string | null
  context?: string | null
  status: 'pending' | 'answered'
  created_at: string
  answered_at?: string | null
}

export async function getClarification(clarificationId: string) {
  return fetchJson<Clarification>(`/clarifications/${clarificationId}`)
}

export async function getPipelineClarifications(pipelineId: string, status?: string) {
  const params = status ? `?status=${status}` : ''
  return fetchJson<{ clarifications: Clarification[] }>(
    `/clarifications/pipeline/${pipelineId}${params}`
  )
}

export async function getPendingClarification(stepId: string) {
  return fetchJson<{ clarification: Clarification | null }>(
    `/clarifications/step/${stepId}/pending`
  )
}

export async function answerClarification(
  clarificationId: string,
  selectedOption?: number,
  customAnswer?: string
) {
  return fetchJson<{
    status: string
    clarification_id: string
    answer: string
    pipeline_resuming: boolean
  }>(
    `/clarifications/${clarificationId}/answer`,
    {
      method: 'POST',
      body: JSON.stringify({
        selected_option: selectedOption,
        custom_answer: customAnswer,
      }),
    }
  )
}

// Share Links API
export interface ShareLink {
  id: string
  pipeline_id: string
  token: string
  share_url: string
  created_at: string
  expires_at?: string | null
  view_count: number
}

export interface SharedPipeline {
  pipeline: {
    id: string
    ticket_key: string
    status: string
    current_step: number
    created_at: string
    started_at?: string
    completed_at?: string
    total_tokens: number
    total_cost: number
  }
  steps: {
    id: string
    step_number: number
    step_name: string
    status: string
    started_at?: string
    completed_at?: string
    tokens_used: number
    cost: number
    output?: string
  }[]
  ticket: {
    id: string
    key: string
    summary: string
    description?: string
    status: string
    priority?: string
    assignee?: string
    project_key?: string
    epic_name?: string
  } | null
  share_info: {
    created_at: string
    expires_at?: string
    view_count: number
  }
}

export async function createShareLink(pipelineId: string, expiresInHours?: number) {
  return fetchJson<ShareLink>('/share', {
    method: 'POST',
    body: JSON.stringify({
      pipeline_id: pipelineId,
      expires_in_hours: expiresInHours,
    }),
  })
}

export async function getSharedPipeline(token: string) {
  return fetchJson<SharedPipeline>(`/share/${token}`)
}

export async function getPipelineShareLinks(pipelineId: string) {
  return fetchJson<{ links: ShareLink[] }>(`/share/pipeline/${pipelineId}/links`)
}

export async function deleteShareLink(shareId: string) {
  return fetchJson<{ status: string; id: string }>(`/share/${shareId}`, {
    method: 'DELETE',
  })
}

// Cycles API
export async function getCycleTypes() {
  return fetchJson<CycleType[]>('/cycles')
}

export async function getCycleType(cycleType: string) {
  return fetchJson<CycleTypeWithPhases>(`/cycles/${cycleType}`)
}

export async function getCyclePhases(cycleType: string) {
  return fetchJson<CyclePhase[]>(`/cycles/${cycleType}/phases`)
}

// Code Review API
export async function getPipelinePR(pipelineId: string) {
  return fetchJson<PullRequest>(`/pipelines/${pipelineId}/pr`)
}

export async function getPipelineReviews(pipelineId: string) {
  return fetchJson<{
    pr: { id: string } | null
    comments: ReviewComment[]
    iterations: ReviewIteration[]
  }>(`/pipelines/${pipelineId}/reviews`)
}

export async function markPipelineComplete(pipelineId: string) {
  return fetchJson<{ status: string; pipeline_id: string; completed_at: string }>(
    `/pipelines/${pipelineId}/complete`,
    { method: 'POST' }
  )
}

// Create pipeline with cycle type
export async function createPipelineWithCycleType(ticketKey: string, cycleType?: string) {
  return fetchJson<Pipeline>('/pipelines', {
    method: 'POST',
    body: JSON.stringify({ ticket_key: ticketKey, cycle_type: cycleType }),
  })
}

// Risk Cards API
import type { RiskCard } from '../types'

export async function getPipelineRisks(pipelineId: string) {
  return fetchJson<{ risks: RiskCard[] }>(`/risks/pipeline/${pipelineId}`)
}

export async function getRiskCard(riskId: string) {
  return fetchJson<RiskCard>(`/risks/${riskId}`)
}

export async function acknowledgeRisk(riskId: string, acknowledgedBy: string = 'user') {
  return fetchJson<RiskCard>(`/risks/${riskId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
  })
}

export async function resolveRisk(riskId: string, resolutionNotes: string = '') {
  return fetchJson<RiskCard>(`/risks/${riskId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution_notes: resolutionNotes }),
  })
}

export async function getBlockingRisks(pipelineId: string) {
  return fetchJson<{ risks: RiskCard[] }>(`/risks/pipeline/${pipelineId}/blockers`)
}

// Worktree Session API
import type { WorktreeSession } from '../types'

export async function getWorktreeSession(pipelineId: string) {
  return fetchJson<{ session: WorktreeSession | null }>(`/worktrees/pipeline/${pipelineId}`)
}

export async function provideWorktreeInput(sessionId: string, repoCommands: Record<string, string[]>) {
  return fetchJson<{ status: string }>(`/worktrees/sessions/${sessionId}/input`, {
    method: 'POST',
    body: JSON.stringify({ repo_commands: repoCommands }),
  })
}

// Subagent API
import type { SubagentToolCallResponse } from '../types'

export async function getPipelineSubagentToolCalls(pipelineId: string) {
  return fetchJson<SubagentToolCallResponse[]>(`/subagents/pipeline/${pipelineId}`)
}
