import { useState } from 'react'
import * as api from '../lib/api'
import type { ShareLink } from '../lib/api'

interface Props {
  pipelineId: string
}

export default function ShareButton({ pipelineId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadLinks = async () => {
    setLoading(true)
    try {
      const response = await api.getPipelineShareLinks(pipelineId)
      setLinks(response.links)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load share links')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async () => {
    setIsOpen(true)
    await loadLinks()
  }

  const handleClose = () => {
    setIsOpen(false)
    setError(null)
  }

  const handleCreateLink = async (expiresInHours?: number) => {
    setCreating(true)
    setError(null)
    try {
      const link = await api.createShareLink(pipelineId, expiresInHours)
      setLinks((prev) => [link, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (link: ShareLink) => {
    const fullUrl = `${window.location.origin}/share/${link.token}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(link.id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = fullUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(link.id)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleDelete = async (shareId: string) => {
    try {
      await api.deleteShareLink(shareId)
      setLinks((prev) => prev.filter((l) => l.id !== shareId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete share link')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="relative">
      {/* Share Button */}
      <button
        onClick={handleOpen}
        className="btn btn-secondary flex items-center gap-2"
        title="Share pipeline"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
          />

          {/* Modal Content */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-h5">Share Pipeline</h3>
              <button
                onClick={handleClose}
                className="text-text-muted hover:text-text"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              {/* Create New Link */}
              <div className="mb-4">
                <p className="text-sm text-text-muted mb-3">
                  Create a read-only link to share this pipeline's progress.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCreateLink()}
                    disabled={creating}
                    className="btn btn-primary text-sm flex-1"
                  >
                    {creating ? 'Creating...' : 'Create Link (No Expiry)'}
                  </button>
                  <button
                    onClick={() => handleCreateLink(24)}
                    disabled={creating}
                    className="btn btn-secondary text-sm"
                    title="Expires in 24 hours"
                  >
                    24h
                  </button>
                  <button
                    onClick={() => handleCreateLink(168)}
                    disabled={creating}
                    className="btn btn-secondary text-sm"
                    title="Expires in 7 days"
                  >
                    7d
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
                  {error}
                </div>
              )}

              {/* Existing Links */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Existing Links</h4>
                {loading ? (
                  <p className="text-sm text-text-muted">Loading...</p>
                ) : links.length === 0 ? (
                  <p className="text-sm text-text-muted">No share links yet.</p>
                ) : (
                  <div className="space-y-2">
                    {links.map((link) => (
                      <div
                        key={link.id}
                        className={`p-3 bg-surface rounded-lg ${
                          isExpired(link.expires_at) ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-xs bg-background px-2 py-1 rounded">
                            /share/{link.token.slice(0, 8)}...
                          </code>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(link)}
                              className="text-sm text-primary hover:underline"
                              disabled={isExpired(link.expires_at)}
                            >
                              {copied === link.id ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              onClick={() => handleDelete(link.id)}
                              className="text-sm text-error hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-muted">
                          <span>Created {formatDate(link.created_at)}</span>
                          <span>
                            {link.view_count} view{link.view_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {link.expires_at && (
                          <div className="text-xs mt-1">
                            {isExpired(link.expires_at) ? (
                              <span className="text-error">Expired</span>
                            ) : (
                              <span className="text-text-muted">
                                Expires {formatDate(link.expires_at)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
