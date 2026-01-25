import type { WorktreeSession, WorktreeRepo } from '../types'

interface WorktreeProgressPanelProps {
  session: WorktreeSession
  onProvideCommands?: (repoName: string, commands: string[]) => void
}

const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
  pending: { bg: 'bg-gray-700', text: 'text-gray-400', icon: '\u23F3' },
  creating: { bg: 'bg-blue-600/20', text: 'text-blue-400', icon: '\u2699\uFE0F' },
  setup: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: '\uD83D\uDD27' },
  ready: { bg: 'bg-green-600/20', text: 'text-green-400', icon: '\u2705' },
  failed: { bg: 'bg-red-600/20', text: 'text-red-400', icon: '\u274C' },
  needs_user_input: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: '\u2753' },
  cleaned: { bg: 'bg-gray-600/20', text: 'text-gray-400', icon: '\uD83E\uDDF9' },
}

function RepoStatusCard({ repo }: { repo: WorktreeRepo }) {
  const status = statusColors[repo.status] || statusColors.pending

  return (
    <div className={`${status.bg} border border-gray-700 rounded-lg p-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{status.icon}</span>
          <span className="font-medium text-white">{repo.repo_name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${status.text} bg-gray-800`}>
          {repo.status.replace('_', ' ')}
        </span>
      </div>

      <div className="mt-2 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Branch:</span>
          <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">{repo.branch_name}</code>
        </div>
        {repo.worktree_path && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500">Path:</span>
            <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[200px]">
              {repo.worktree_path}
            </code>
          </div>
        )}
      </div>

      {repo.setup_commands && repo.setup_commands.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-gray-500">Setup commands:</span>
          <div className="mt-1 space-y-1">
            {repo.setup_commands.map((cmd, i) => (
              <code key={i} className="block text-xs bg-gray-900 px-2 py-1 rounded text-green-400">
                $ {cmd}
              </code>
            ))}
          </div>
        </div>
      )}

      {repo.pr_url && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">PR:</span>
          <a
            href={repo.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            {repo.pr_url.split('/').pop()}
          </a>
          {repo.pr_merged && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-400">
              Merged
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function WorktreeProgressPanel({ session, onProvideCommands }: WorktreeProgressPanelProps) {
  const status = statusColors[session.status] || statusColors.pending
  const needsInput = session.status === 'needs_user_input' && session.user_input_request

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className={`${status.bg} px-4 py-3 border-b border-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{status.icon}</span>
            <h3 className="font-medium text-white">Worktree Session</h3>
          </div>
          <span className={`text-sm ${status.text}`}>
            {session.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Ticket: {session.ticket_key} | Base: {session.base_path}
        </p>
      </div>

      {/* Repos */}
      <div className="p-4 space-y-3">
        {session.repos.map(repo => (
          <RepoStatusCard key={repo.id} repo={repo} />
        ))}
      </div>

      {/* User Input Required */}
      {needsInput && session.user_input_request && (
        <div className="border-t border-gray-700 p-4 bg-yellow-900/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-400">\u26A0\uFE0F</span>
            <h4 className="font-medium text-yellow-400">Setup Commands Required</h4>
          </div>
          <p className="text-sm text-gray-300 mb-4">
            Please provide setup commands for the following repositories:
          </p>
          {session.user_input_request.repos.map(repo => (
            <div key={repo.name} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-white">{repo.name}</span>
              </div>
              {repo.reasoning && (
                <p className="text-xs text-gray-400 mb-2">{repo.reasoning}</p>
              )}
              {repo.files_checked && repo.files_checked.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">
                  Checked: {repo.files_checked.join(', ')}
                </div>
              )}
              {repo.suggested_commands && repo.suggested_commands.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-gray-400">Suggested:</span>
                  <div className="mt-1 space-y-1">
                    {repo.suggested_commands.map((cmd, i) => (
                      <code key={i} className="block text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                        $ {cmd}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              {onProvideCommands && (
                <button
                  onClick={() => onProvideCommands(repo.name, repo.suggested_commands || [])}
                  className="text-sm px-3 py-1.5 bg-primary text-black rounded hover:bg-primary/80 transition-colors"
                >
                  Use Suggested Commands
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {session.error_message && (
        <div className="border-t border-red-700/50 p-4 bg-red-900/10">
          <div className="flex items-start gap-2">
            <span className="text-red-400">\u274C</span>
            <div>
              <h4 className="font-medium text-red-400">Error</h4>
              <p className="text-sm text-gray-300 mt-1">{session.error_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="border-t border-gray-700 px-4 py-2 text-xs text-gray-500 flex justify-between">
        {session.created_at && (
          <span>Created: {new Date(session.created_at).toLocaleString()}</span>
        )}
        {session.ready_at && (
          <span>Ready: {new Date(session.ready_at).toLocaleString()}</span>
        )}
      </div>
    </div>
  )
}
