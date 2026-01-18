import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { PipelineStep } from '../types'
import type { StepEvent } from '../lib/store'
import type { StepEvent as ApiStepEvent } from '../lib/api'
import * as api from '../lib/api'


// Render arguments as a simple table
const ArgsTable = ({ args }: { args: object }) => {
  const entries = Object.entries(args)
  if (entries.length === 0) return <span className="text-text-muted text-xs">No arguments</span>

  return (
    <table className="w-full text-xs border-collapse">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key} className="border-b border-gray-100 last:border-0">
            <td className="py-1 pr-3 text-text-muted font-medium align-top whitespace-nowrap font-mono">{key}</td>
            <td className="py-1 text-text-body break-all">
              {typeof value === 'string'
                ? (value.length > 200 ? value.slice(0, 200) + '...' : value)
                : JSON.stringify(value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Compact tool call display
const ToolCallItem = ({ tool, args, isRunning }: { tool: string; args: object; isRunning?: boolean }) => {
  const [expanded, setExpanded] = useState(false)
  const argCount = Object.keys(args).length

  return (
    <div className="mb-2">
      <button
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors border ${isRunning
          ? 'bg-info/20 text-primary-dark border-info hover:bg-info/30'
          : 'bg-bg-page text-text-body border-transparent hover:border-gray-200'
          }`}
        onClick={() => setExpanded(!expanded)}
      >
        {isRunning && (
          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        <span>{tool}</span>
        <span className="text-text-muted">({argCount})</span>
        <svg className={`w-3 h-3 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-1 ml-2 p-2 bg-bg-page rounded max-h-32 overflow-auto">
          <ArgsTable args={args} />
        </div>
      )}
    </div>
  )
}

// Markdown text block with design system styling
const TextBlock = ({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false)
  const isLong = content.length > 500

  return (
    <div className="mb-3">
      <div className={`prose prose-sm max-w-none ${!expanded && isLong ? 'line-clamp-6' : ''}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-lg font-semibold text-text-heading mt-4 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-semibold text-text-heading mt-3 mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold text-text-heading mt-2 mb-1">{children}</h3>,
            p: ({ children }) => <p className="text-sm text-text-body mb-2 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="text-sm text-text-body mb-2 ml-4 list-disc">{children}</ul>,
            ol: ({ children }) => <ol className="text-sm text-text-body mb-2 ml-4 list-decimal">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            code: ({ children, className }) => {
              const match = /language-(\w+)/.exec(className || '')
              const language = match ? match[1] : ''
              const isBlock = !!match || (typeof children === 'string' && children.includes('\n'))

              if (isBlock) {
                return (
                  <SyntaxHighlighter
                    style={oneLight}
                    language={language || 'text'}
                    PreTag="div"
                    customStyle={{
                      margin: '0.5rem 0',
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                )
              }
              return (
                <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
              )
            },
            pre: ({ children }) => <>{children}</>,
            strong: ({ children }) => <strong className="font-semibold text-text-heading">{children}</strong>,
            a: ({ children, href }) => <a href={href} className="text-primary-dark underline hover:no-underline">{children}</a>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-primary pl-3 my-2 italic text-text-muted">{children}</blockquote>,
            hr: () => <hr className="my-3 border-gray-200" />,
            table: ({ children }) => <table className="text-xs w-full border-collapse my-2 border border-gray-200">{children}</table>,
            thead: ({ children }) => <thead className="bg-bg-page">{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
            th: ({ children }) => <th className="border border-gray-200 bg-bg-page px-2 py-1 text-left font-medium text-text-heading">{children}</th>,
            td: ({ children }) => <td className="border border-gray-200 px-2 py-1 text-text-body">{children}</td>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-text-muted hover:text-primary-dark mt-1"
        >
          {expanded ? '← show less' : 'show more...'}
        </button>
      )}
    </div>
  )
}

// Render a single event
const EventItem = ({ event }: { event: ApiStepEvent }) => {
  if (event.type === 'tool_call') {
    return <ToolCallItem tool={event.tool || ''} args={event.arguments || {}} />
  }
  return <TextBlock content={event.content || ''} />
}

// Completed events view - shows last text as output, with "show all" for history
const CompletedEventsView = ({ events }: { events: ApiStepEvent[] }) => {
  const [showAll, setShowAll] = useState(false)

  // Find the last text event (the output)
  const lastTextIndex = events.map(e => e.type).lastIndexOf('text')
  const lastTextEvent = lastTextIndex >= 0 ? events[lastTextIndex] : null
  const previousEvents = lastTextIndex >= 0 ? events.slice(0, lastTextIndex) : events
  const hasHistory = previousEvents.length > 0

  if (showAll) {
    return (
      <>
        {hasHistory && (
          <button
            onClick={() => setShowAll(false)}
            className="text-xs text-text-muted hover:text-primary-dark mb-3"
          >
            ← Hide history
          </button>
        )}
        {events.map((event, idx) => (
          <EventItem key={idx} event={event} />
        ))}
      </>
    )
  }

  return (
    <>
      {hasHistory && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-text-muted hover:text-primary-dark mb-3 flex items-center gap-1"
        >
          <span>Show {previousEvents.length} previous steps</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
      {lastTextEvent && <EventItem event={lastTextEvent} />}
      {!lastTextEvent && events.length > 0 && (
        // If no text event, show the last event whatever it is
        <EventItem event={events[events.length - 1]} />
      )}
    </>
  )
}

// Streaming text with markdown rendering
const StreamingTextBlock = ({ content, showCursor }: { content: string; showCursor: boolean }) => {
  return (
    <div className="mb-3">
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-lg font-semibold text-text-heading mt-4 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-semibold text-text-heading mt-3 mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold text-text-heading mt-2 mb-1">{children}</h3>,
            p: ({ children }) => <p className="text-sm text-text-body mb-2 leading-relaxed">{children}{showCursor && <span className="streaming-cursor" />}</p>,
            ul: ({ children }) => <ul className="text-sm text-text-body mb-2 ml-4 list-disc">{children}</ul>,
            ol: ({ children }) => <ol className="text-sm text-text-body mb-2 ml-4 list-decimal">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            code: ({ children, className }) => {
              const match = /language-(\w+)/.exec(className || '')
              const language = match ? match[1] : ''
              const isBlock = !!match || (typeof children === 'string' && children.includes('\n'))

              if (isBlock) {
                return (
                  <SyntaxHighlighter
                    style={oneLight}
                    language={language || 'text'}
                    PreTag="div"
                    customStyle={{
                      margin: '0.5rem 0',
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                )
              }
              return (
                <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
              )
            },
            pre: ({ children }) => <>{children}</>,
            strong: ({ children }) => <strong className="font-semibold text-text-heading">{children}</strong>,
            a: ({ children, href }) => <a href={href} className="text-primary-dark underline hover:no-underline">{children}</a>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-primary pl-3 my-2 italic text-text-muted">{children}</blockquote>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

// Running event component
const RunningEvent = ({ event, showCursor }: { event: StepEvent; showCursor: boolean }) => {
  if (event.type === 'tool_call') {
    return <ToolCallItem tool={event.tool} args={event.arguments} isRunning />
  }

  return <StreamingTextBlock content={event.content} showCursor={showCursor} />
}

interface StepCardProps {
  step: PipelineStep
  pipelineId: string
  isActive: boolean
  stepEvents: StepEvent[]  // Chronologically ordered events (text + tool calls) - for running steps
  completedEvents?: ApiStepEvent[]  // Chronological events loaded from DB for completed steps
  completedOutput?: string  // Fallback: text content for old data without events
  completedToolCalls?: { tool: string; arguments: string }[]  // Fallback: tool calls for old data
}

export default function StepCard({
  step,
  pipelineId,
  isActive,
  stepEvents = [],
  completedEvents = [],
  completedOutput = '',
  completedToolCalls = [],
}: StepCardProps) {
  const [expanded, setExpanded] = useState(isActive)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new events arrive during running state
  useEffect(() => {
    if (step.status === 'running' && expanded && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [stepEvents, step.status, expanded])

  const getStatusClass = () => {
    switch (step.status) {
      case 'completed':
        return 'step-card--completed'
      case 'running':
        return 'step-card--running'
      case 'failed':
        return 'step-card--failed'
      case 'paused':
        return 'step-card--paused'
      default:
        return 'step-card--pending'
    }
  }

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'running':
        return <div className="status-dot status-dot--running animate-pulse" />
      case 'failed':
        return (
          <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'paused':
        return <div className="status-dot status-dot--paused" />
      default:
        return <div className="status-dot status-dot--pending" />
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return

    setSubmitting(true)
    try {
      await api.provideFeedback(pipelineId, step.step_number, feedback)
      setFeedbackOpen(false)
      setFeedback('')
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`step-card ${getStatusClass()}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <span className="font-mono text-sm text-text-muted">
              Step {step.step_number}
            </span>
            <h4 className="text-h5">{step.step_name}</h4>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {step.tokens_used > 0 && (
            <span className="text-sm text-text-muted">
              {step.tokens_used.toLocaleString()} tokens &bull; $
              {step.cost.toFixed(4)}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Expanded Content - Fixed height scrollable */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div ref={scrollContainerRef} className="max-h-96 overflow-y-auto pr-2">
            {/* Streaming Events (during running) */}
            {step.status === 'running' && stepEvents.length > 0 && (
              <>
                {stepEvents.map((event, idx) => (
                  <RunningEvent
                    key={idx}
                    event={event}
                    showCursor={idx === stepEvents.length - 1 && event.type === 'text'}
                  />
                ))}
              </>
            )}

            {/* Show placeholder while running with no events */}
            {step.status === 'running' && stepEvents.length === 0 && (
              <p className="text-text-muted text-sm italic">
                Waiting for agent output...
                <span className="streaming-cursor" />
              </p>
            )}

            {/* Show message for pending steps */}
            {step.status === 'pending' && (
              <p className="text-text-muted text-sm italic text-center py-4">
                Step not started yet
              </p>
            )}

            {/* Show message for paused steps */}
            {step.status === 'paused' && stepEvents.length === 0 && (
              <p className="text-text-muted text-sm italic text-center py-4">
                Step paused
              </p>
            )}

            {/* Completed Output (after completion) */}
            {step.status === 'completed' && (completedEvents.length > 0 || completedOutput || completedToolCalls.length > 0) && (
              <>
                {completedEvents.length > 0 ? (
                  // New format: show last output with "show all" for history
                  <CompletedEventsView events={completedEvents} />
                ) : (
                  // Fallback: old format - just show text output
                  completedOutput && <TextBlock content={completedOutput} />
                )}
              </>
            )}

            {/* Show placeholder if completed but no output */}
            {step.status === 'completed' && completedEvents.length === 0 && !completedOutput && completedToolCalls.length === 0 && (
              <p className="text-sm text-text-muted italic">
                Step completed successfully. Output not captured during streaming.
              </p>
            )}
          </div>

          {/* Error Message - outside scrollable area */}
          {step.error_message && (
            <div className="mt-3 bg-red-50 border border-error rounded-lg p-3">
              <p className="text-error text-xs font-mono">
                {step.error_message}
              </p>
            </div>
          )}

          {/* Actions - outside scrollable area */}
          {(step.status === 'completed' || step.status === 'failed') && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFeedbackOpen(!feedbackOpen)
                }}
                className="btn btn-secondary text-xs py-1.5 px-3"
              >
                Provide Feedback
              </button>
            </div>
          )}

          {/* Feedback Form */}
          {feedbackOpen && (
            <div className="border-t border-border-light pt-3 mt-3">
              <label className="block text-xs font-medium text-text-heading mb-2">
                What should the agent do differently?
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe the changes you want..."
                className="w-full p-2 border border-border-primary rounded text-xs resize-none"
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setFeedbackOpen(false)}
                  className="text-xs text-text-muted hover:text-text-body"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedback.trim() || submitting}
                  className="btn btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
