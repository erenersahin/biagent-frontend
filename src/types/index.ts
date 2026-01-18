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
  status: PipelineStatus
  current_step: number
  created_at: string
  started_at?: string
  paused_at?: string
  completed_at?: string
  total_tokens: number
  total_cost: number
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
  type: 'step_completed' | 'pipeline_completed' | 'pipeline_failed'
  pipeline_id: string
  data: object
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
  | { type: 'tool_call_started'; pipeline_id: string; step: number; tool: string; arguments: object }
  | { type: 'sync_complete'; count: number; timestamp: string }
  | { type: 'ticket_updated'; id: string; key: string; changes: string[] }
  // Worktree events
  | { type: 'worktree_session_creating'; pipeline_id: string; ticket_key: string; repos: string[] }
  | { type: 'worktree_setup_started'; pipeline_id: string; repo_name: string }
  | { type: 'worktree_session_ready'; pipeline_id: string; repos: { name: string; path: string }[] }
  | { type: 'pipeline_needs_input'; pipeline_id: string; input_type: string; repos: { name: string; files_checked: string[] }[] }
  | { type: 'worktree_pr_merged'; pipeline_id: string; repo_name: string; branch_name: string; pr_url: string }
  | { type: 'worktree_session_cleaned'; pipeline_id: string; session_id: string; reason: string }

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
    files_checked: string[]
    detected_package_manager?: string
    suggested_commands?: string[]
  }[]
}
