import { useState } from 'react'
import { useStore } from '../lib/store'
import * as api from '../lib/api'

interface Props {
  pipelineId: string
}

export default function UserInputPrompt({ pipelineId }: Props) {
  const userInputRequest = useStore((state) => state.userInputRequest)
  const clearUserInputRequest = useStore((state) => state.clearUserInputRequest)

  const [commands, setCommands] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!userInputRequest || userInputRequest.input_type !== 'setup_commands') {
    return null
  }

  const handleCommandChange = (repoName: string, value: string) => {
    setCommands((prev) => ({ ...prev, [repoName]: value }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      // Convert multiline commands to array
      const data: Record<string, string[]> = {}
      for (const repo of userInputRequest.repos) {
        const repoCommands = commands[repo.name] || ''
        data[repo.name] = repoCommands
          .split('\n')
          .map((cmd) => cmd.trim())
          .filter((cmd) => cmd.length > 0)
      }

      await api.provideUserInput(pipelineId, 'setup_commands', data)
      clearUserInputRequest()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit commands')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card border-2 border-primary bg-primary/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <svg
            className="w-5 h-5 text-background"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-h5 text-primary">Setup Commands Needed</h3>
          <p className="text-sm text-text-muted">
            BiAgent couldn't automatically detect setup commands for these repositories.
            Please provide the commands needed to set up each repository.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {userInputRequest.repos.map((repo) => (
          <div key={repo.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-sm font-semibold">{repo.name}</label>
              {repo.detected_package_manager && (
                <span className="text-xs px-2 py-1 bg-surface rounded">
                  Detected: {repo.detected_package_manager}
                </span>
              )}
            </div>

            {repo.files_checked && repo.files_checked.length > 0 && (
              <p className="text-xs text-text-muted">
                Files checked: {repo.files_checked.join(', ')}
              </p>
            )}

            {repo.suggested_commands && repo.suggested_commands.length > 0 && (
              <div className="text-xs text-text-muted mb-2">
                <span className="font-medium">Suggested:</span>{' '}
                <code className="bg-surface px-1 rounded">
                  {repo.suggested_commands.join(' && ')}
                </code>
                <button
                  type="button"
                  className="ml-2 text-primary hover:underline"
                  onClick={() =>
                    handleCommandChange(repo.name, repo.suggested_commands!.join('\n'))
                  }
                >
                  Use these
                </button>
              </div>
            )}

            <textarea
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
              placeholder={`Enter setup commands for ${repo.name}, one per line:
npm install
npm run build
cp .env.example .env`}
              value={commands[repo.name] || ''}
              onChange={(e) => handleCommandChange(repo.name, e.target.value)}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            // Use empty commands (skip setup)
            const emptyData: Record<string, string[]> = {}
            for (const repo of userInputRequest.repos) {
              emptyData[repo.name] = []
            }
            api.provideUserInput(pipelineId, 'setup_commands', emptyData)
              .then(() => clearUserInputRequest())
              .catch((err) => setError(err instanceof Error ? err.message : 'Failed to skip setup'))
          }}
          disabled={submitting}
        >
          Skip Setup
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Continue Pipeline'}
        </button>
      </div>
    </div>
  )
}
