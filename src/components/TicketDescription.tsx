import { useMemo, useState } from 'react'
import type { Ticket, Attachment } from '../types'

// Generate proxy URLs for JIRA attachments (authentication handled by backend)
function getThumbnailUrl(attachment: Attachment): string {
  return `/api/tickets/attachments/${attachment.id}/thumbnail`
}

function getContentUrl(attachment: Attachment): string {
  return `/api/tickets/attachments/${attachment.id}/content`
}

// Issue type configuration with icons and colors
const ISSUE_TYPE_CONFIG: Record<string, { icon: JSX.Element; color: string; label: string }> = {
  bug: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: 'bg-red-100 text-red-700 border-red-300',
    label: 'Bug',
  },
  story: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    color: 'bg-green-100 text-green-700 border-green-300',
    label: 'Story',
  },
  task: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    label: 'Task',
  },
  epic: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    label: 'Epic',
  },
  subtask: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
    ),
    color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    label: 'Sub-task',
  },
  feature: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    color: 'bg-primary/20 text-primary-dark border-primary',
    label: 'Feature',
  },
  improvement: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    label: 'Improvement',
  },
}

// Default issue type for unknown types
const DEFAULT_ISSUE_TYPE = {
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  color: 'bg-gray-100 text-gray-700 border-gray-300',
  label: 'Issue',
}

// Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Check if attachment is an image
function isImageAttachment(attachment: Attachment): boolean {
  const mimeType = attachment.mime_type?.toLowerCase() || ''
  return mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(attachment.filename)
}

// Check if attachment is a PDF
function isPdfAttachment(attachment: Attachment): boolean {
  const mimeType = attachment.mime_type?.toLowerCase() || ''
  return mimeType === 'application/pdf' || attachment.filename.toLowerCase().endsWith('.pdf')
}

// Get file icon based on mime type
function getFileIcon(attachment: Attachment): JSX.Element {
  if (isImageAttachment(attachment)) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  if (isPdfAttachment(attachment)) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

// Parse and render description with links highlighted
function renderDescriptionWithLinks(text: string): JSX.Element[] {
  const elements: JSX.Element[] = []
  const lines = text.split('\n')

  lines.forEach((line, lineIndex) => {
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g

    // Check if line is a header (starts with # or is ALL CAPS and short)
    const isMarkdownHeader = /^#{1,6}\s/.test(line)
    const isAllCapsHeader = /^[A-Z][A-Z\s]{2,30}:?$/.test(line.trim()) && line.trim().length <= 40

    if (isMarkdownHeader) {
      const headerMatch = line.match(/^(#{1,6})\s(.*)/)
      if (headerMatch) {
        const level = headerMatch[1].length
        const content = headerMatch[2]
        const className = level === 1 ? 'text-lg font-semibold text-text-heading' :
                         level === 2 ? 'text-base font-semibold text-text-heading' :
                         'text-sm font-medium text-text-heading'
        elements.push(
          <div key={`line-${lineIndex}`} className={`${className} mt-4 mb-2`}>
            {content}
          </div>
        )
        return
      }
    }

    if (isAllCapsHeader) {
      elements.push(
        <div key={`line-${lineIndex}`} className="text-sm font-semibold text-text-heading uppercase tracking-wide mt-4 mb-2 border-b border-gray-200 pb-1">
          {line.trim().replace(/:$/, '')}
        </div>
      )
      return
    }

    // Check for bullet points
    const isBullet = /^[\s]*[-*]\s/.test(line)
    const isNumbered = /^[\s]*\d+[.)]\s/.test(line)

    // Split line by URLs
    const parts = line.split(urlPattern)
    const lineElements: (string | JSX.Element)[] = []

    parts.forEach((part, partIndex) => {
      if (urlPattern.test(part)) {
        // Reset lastIndex for the test
        urlPattern.lastIndex = 0
        lineElements.push(
          <a
            key={`link-${lineIndex}-${partIndex}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline break-all"
          >
            {part}
          </a>
        )
      } else {
        lineElements.push(part)
      }
    })

    if (isBullet || isNumbered) {
      elements.push(
        <div key={`line-${lineIndex}`} className="flex gap-2 py-0.5">
          <span className="text-text-muted flex-shrink-0">{isBullet ? '\u2022' : line.match(/^\s*(\d+[.)])/)?.[1] || '\u2022'}</span>
          <span>{lineElements.slice(1)}</span>
        </div>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={`line-${lineIndex}`} className="h-2" />)
    } else {
      elements.push(
        <div key={`line-${lineIndex}`} className="py-0.5">
          {lineElements}
        </div>
      )
    }
  })

  return elements
}

interface TicketDescriptionProps {
  ticket: Ticket
}

export default function TicketDescription({ ticket }: TicketDescriptionProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  // Get issue type config
  const issueTypeConfig = useMemo(() => {
    const typeKey = ticket.issue_type?.toLowerCase().replace(/[- ]/g, '') || 'feature'
    return ISSUE_TYPE_CONFIG[typeKey] || DEFAULT_ISSUE_TYPE
  }, [ticket.issue_type])

  // Parse description into sections
  const renderedDescription = useMemo(() => {
    if (!ticket.description) return null
    return renderDescriptionWithLinks(ticket.description)
  }, [ticket.description])

  // Separate attachments by type
  const { images, otherFiles } = useMemo(() => {
    const attachments = ticket.attachments || []
    return {
      images: attachments.filter(isImageAttachment),
      otherFiles: attachments.filter(att => !isImageAttachment(att)),
    }
  }, [ticket.attachments])

  return (
    <div className="card">
      {/* Header with Issue Type */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${issueTypeConfig.color}`}>
          {issueTypeConfig.icon}
          <span className="font-medium text-sm">{issueTypeConfig.label}</span>
        </div>

        {ticket.priority && (
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span>{ticket.priority}</span>
          </div>
        )}

        {ticket.epic_name && (
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="truncate max-w-[200px]" title={ticket.epic_name}>{ticket.epic_name}</span>
          </div>
        )}
      </div>

      {/* Description Section */}
      {ticket.description && (
        <div className="mb-6">
          <h3 className="section-label mb-3">/ Description</h3>
          <div className="text-text-body text-sm leading-relaxed">
            {renderedDescription}
          </div>
        </div>
      )}

      {/* Image Attachments with Previews */}
      {images.length > 0 && (
        <div className="mb-6">
          <h3 className="section-label mb-3">/ Images</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((attachment) => (
              <button
                key={attachment.id}
                onClick={() => setExpandedImage(getContentUrl(attachment))}
                className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors"
              >
                <img
                  src={getThumbnailUrl(attachment)}
                  alt={attachment.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{attachment.filename}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Other Attachments */}
      {otherFiles.length > 0 && (
        <div>
          <h3 className="section-label mb-3">/ Attachments</h3>
          <div className="space-y-2">
            {otherFiles.map((attachment) => (
              <a
                key={attachment.id}
                href={getContentUrl(attachment)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors group"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:text-primary-dark group-hover:bg-primary/20 transition-colors">
                  {getFileIcon(attachment)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-heading truncate group-hover:text-primary-dark">
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatFileSize(attachment.size)}
                    {attachment.author && ` \u2022 ${attachment.author}`}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-dark flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* No description or attachments */}
      {!ticket.description && (!ticket.attachments || ticket.attachments.length === 0) && (
        <p className="text-text-muted text-sm italic">No description available</p>
      )}

      {/* Image Preview Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-primary transition-colors"
            onClick={() => setExpandedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={expandedImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
