// Attachment types
export interface Attachment {
  id: string
  filename: string
  mime_type?: string
  size?: number
  content_url: string
  thumbnail_url?: string
  author?: string
  created_at?: string
}

// Ticket types
export interface Ticket {
  id: string
  key: string
  summary: string
  description?: string
  status: string
  priority?: string
  assignee?: string
  project_key?: string
  issue_type?: string
  epic_key?: string
  epic_name?: string
  created_at?: string
  updated_at?: string
  pipeline_status?: PipelineStatus
  attachments?: Attachment[]
}

// Pipeline types
export type PipelineStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'waiting_for_review'
  | 'suspended'
  | 'needs_user_input'

export type StepStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting'

export interface Pipeline {
  id: string
  ticket_key: string
  cycle_type?: string
  status: PipelineStatus
  current_step: number
  created_at: string
  started_at?: string
  paused_at?: string
  completed_at?: string
  total_tokens: number
  total_cost: number
  // Worktree session data (included when status is needs_user_input)
  worktree_status?: string
  user_input_request?: {
    repos: Array<{
      name: string
      files_checked?: string[]
      reasoning?: string
      detected_package_manager?: string
      suggested_commands?: string[]
    }>
  }
}

export interface PipelineStep {
  id: string
  step_number: number
  step_name: string
  status: StepStatus
  started_at?: string
  completed_at?: string
  tokens_used: number
  cost: number
  error_message?: string
  retry_count: number
}

export interface StepOutput {
  id: string
  output_type: string
  content?: string
  content_json?: object
  created_at: string
}

// Session types
export interface Tab {
  id: string
  ticket_key: string
  pipeline_id?: string
  ticket_summary?: string
  pipeline_status?: PipelineStatus
  current_step?: number
}

export interface Session {
  session_id: string
  tabs: Tab[]
  active_tab?: string
  missed_events: OfflineEvent[]
}

export interface OfflineEvent {
  id: string
  type: 'step_completed' | 'pipeline_completed' | 'pipeline_failed' | 'pipeline_paused' | 'pr_approved' | 'changes_requested' | 'review_received' | 'waiting_for_review'
  pipeline_id: string
  data: Record<string, unknown>
  occurred_at: string
}

// WebSocket message types
export type WSMessage =
  | { type: 'connected'; client_id: string }
  | { type: 'pipeline_started'; pipeline_id: string; ticket_key: string }
  | { type: 'step_started'; pipeline_id: string; step: number; step_name: string }
  | { type: 'token'; pipeline_id: string; step: number; token: string }
  | { type: 'step_completed'; pipeline_id: string; step: number; next_step: number | null; tokens_used: number; cost: number; output?: string }
  | { type: 'pipeline_paused'; pipeline_id: string; step: number }
  | { type: 'pipeline_resumed'; pipeline_id: string; step: number }
  | { type: 'pipeline_completed'; pipeline_id: string; total_tokens?: number; total_cost?: number }
  | { type: 'pipeline_failed'; pipeline_id: string; step: number; error: string }
  | { type: 'tool_call_started'; pipeline_id: string; step: number; tool: string; tool_use_id?: string; arguments: object }
  | { type: 'subagent_tool_call'; pipeline_id: string; step: number; parent_tool_use_id: string; tool_use_id: string; tool_name: string; arguments: object; timestamp: string }
  | { type: 'subagent_text'; pipeline_id: string; step: number; parent_tool_use_id: string; text: string; timestamp: string }
  | { type: 'sync_complete'; count: number; timestamp: string }
  | { type: 'ticket_updated'; id: string; key: string; changes: string[] }
  | { type: 'step_skipped'; pipeline_id: string; step: number; reason: string; next_step: number }
  // Clarification events
  | { type: 'clarification_requested'; pipeline_id: string; step: number; clarification_id: string; question: string; options: string[]; context?: string }
  | { type: 'clarification_answered'; pipeline_id: string; step: number; clarification_id: string; selected_option?: number; answer: string }
  // Worktree events
  | { type: 'worktree_session_creating'; pipeline_id: string; ticket_key: string; repos: string[] }
  | { type: 'worktree_setup_started'; pipeline_id: string; repo_name: string }
  | { type: 'worktree_session_ready'; pipeline_id: string; repos: { name: string; path: string }[] }
  | { type: 'pipeline_needs_input'; pipeline_id: string; input_type: string; repos: { name: string; files_checked: string[] }[] }
  | { type: 'worktree_pr_merged'; pipeline_id: string; repo_name: string; branch_name: string; pr_url: string }
  | { type: 'worktree_session_cleaned'; pipeline_id: string; session_id: string; reason: string }
  // Code review events
  | { type: 'waiting_for_review'; pipeline_id: string; pr_number: number; pr_url: string }
  | { type: 'review_received'; pipeline_id: string; pr_number: number; comment_count: number }
  | { type: 'review_responded'; pipeline_id: string; pr_number: number; comments_addressed: number }
  | { type: 'pr_approved'; pipeline_id: string; pr_number: number; approved_by?: string }
  | { type: 'changes_requested'; pipeline_id: string; pr_number: number; comment_count: number }
  // Offline events
  | { type: 'offline_event'; event_id: string; event_type: string; pipeline_id: string; data: object; occurred_at: string }

// Stats types
export interface TicketStats {
  total: number
  completed: number
  in_progress: number
  pending: number
  failed: number
}

// Worktree types
export interface WorktreeRepo {
  id: string
  repo_name: string
  repo_path: string
  worktree_path: string
  branch_name: string
  status: 'pending' | 'creating' | 'setup' | 'ready' | 'failed'
  setup_commands?: string[]
  pr_url?: string
  pr_merged: boolean
}

export interface WorktreeSession {
  id: string
  pipeline_id: string
  ticket_key: string
  status: 'pending' | 'creating' | 'ready' | 'needs_user_input' | 'failed' | 'cleaned'
  base_path: string
  repos: WorktreeRepo[]
  created_at?: string
  ready_at?: string
  error_message?: string
  user_input_request?: UserInputRequest
}

export interface UserInputRequest {
  input_type: 'setup_commands'
  repos: {
    name: string
    files_checked?: string[]
    reasoning?: string
    detected_package_manager?: string
    suggested_commands?: string[]
  }[]
}

// Cycle Types
export interface CycleType {
  id: string
  name: string
  display_name: string
  description?: string
  icon?: string
}

export interface CyclePhase {
  id: string
  step_number: number
  name: string
  description?: string
  is_enabled: boolean
}

export interface CycleTypeWithPhases extends CycleType {
  phases: CyclePhase[]
}

// Code Review Types
export interface PullRequest {
  id: string
  pipeline_id: string
  pr_number: number
  pr_url: string
  branch: string
  status: 'open' | 'approved' | 'merged' | 'closed'
  approval_count: number
  created_at: string
  approved_at?: string
  merged_at?: string
}

export interface ReviewComment {
  id: string
  pr_id: string
  github_comment_id?: string
  comment_body: string
  file_path?: string
  line_number?: number
  reviewer?: string
  review_state?: 'comment' | 'approve' | 'changes_requested'
  processed: boolean
  agent_response?: string
  created_at: string
  processed_at?: string
}

export interface ReviewIteration {
  id: string
  pr_id: string
  iteration_number: number
  comments_received?: number
  comments_addressed?: number
  commit_sha?: string
  created_at: string
}

// Risk Types
export type RiskSeverity = 'high' | 'medium' | 'low'
export type RiskCategory = 'technical' | 'security' | 'performance' | 'dependency' | 'testing' | 'blocker'

export interface RiskCard {
  id: string
  pipeline_id: string
  step_id: string
  severity: RiskSeverity
  category: RiskCategory
  title: string
  description: string
  impact?: string
  mitigation?: string
  is_blocker: boolean
  acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  resolved: boolean
  resolved_at?: string
  resolution_notes?: string
  created_at: string
}

// Clarification Types
export interface Clarification {
  id: string
  step_id: string
  pipeline_id: string
  question: string
  options: string[]
  selected_option?: number
  custom_answer?: string
  context?: string
  status: 'pending' | 'answered'
  created_at: string
  answered_at?: string
}

// Subagent Types

// Subagent event (text or tool call, chronologically ordered)
export interface SubagentEvent {
  type: 'text' | 'tool_call'
  timestamp: string
  // For text events
  content?: string
  // For tool call events
  tool_use_id?: string
  tool_name?: string
  arguments?: Record<string, unknown>
}

// Subagent tool call (streamed in real-time)
export interface SubagentToolCall {
  tool_use_id: string
  tool_name: string
  arguments: Record<string, unknown>
  timestamp: string
}

// Subagent activity grouped by parent Task
export interface SubagentActivity {
  parent_tool_use_id: string   // Links to Task's tool_use_id
  subagent_type?: string       // e.g., "context_agent"
  events: SubagentEvent[]      // Chronological events (text + tool calls)
  tool_calls: SubagentToolCall[]  // Keep for backwards compatibility
  status: 'running' | 'completed'
}

// Subagent tool call response from API
export interface SubagentToolCallResponse {
  id: string
  step_number: number
  parent_tool_use_id: string
  tool_use_id: string
  tool_name: string
  arguments: Record<string, unknown>
  created_at: string
}
