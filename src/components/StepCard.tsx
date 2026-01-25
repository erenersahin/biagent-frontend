import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { PipelineStep, SubagentActivity } from '../types'
import type { StepEvent } from '../lib/store'
import type { StepEvent as ApiStepEvent } from '../lib/api'
import RecoveryOptions from './RecoveryOptions'


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

// Compact tool call display with optional subagent activity
const ToolCallItem = ({
  tool,
  args,
  isRunning,
  subagentActivity,
}: {
  tool: string
  args: object
  isRunning?: boolean
  subagentActivity?: SubagentActivity
}) => {
  const [expanded, setExpanded] = useState(false)
  const [subagentExpanded, setSubagentExpanded] = useState(true)  // Auto-expand subagent activity
  const argCount = Object.keys(args).length
  const isTask = tool === 'Task'
  const hasSubagentActivity = isTask && subagentActivity && subagentActivity.tool_calls.length > 0

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
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

        {/* Subagent activity toggle for Task tool */}
        {hasSubagentActivity && (
          <button
            onClick={() => setSubagentExpanded(!subagentExpanded)}
            className="text-xs text-text-muted hover:text-primary-dark flex items-center gap-1"
          >
            <span>{subagentActivity.tool_calls.length} subagent tools</span>
            {subagentActivity.status === 'running' && (
              <span className="w-1.5 h-1.5 bg-info rounded-full animate-pulse" />
            )}
            <svg className={`w-3 h-3 transition-transform ${subagentExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-1 ml-2 p-2 bg-bg-page rounded max-h-32 overflow-auto">
          <ArgsTable args={args} />
        </div>
      )}

      {/* Nested subagent tool calls */}
      {hasSubagentActivity && subagentExpanded && (
        <div className="ml-4 pl-3 border-l-2 border-info/20 mt-1 space-y-0.5">
          {subagentActivity.tool_calls.map((tc, i) => (
            <SubagentToolCallItem key={tc.tool_use_id || i} toolCall={tc} />
          ))}
          {subagentActivity.status === 'running' && (
            <div className="text-text-muted/50 text-xs animate-pulse py-0.5 flex items-center gap-1">
              <span>↳</span>
              <span>executing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Subagent tool call display (compact inline)
const SubagentToolCallItem = ({ toolCall }: { toolCall: SubagentActivity['tool_calls'][0] }) => {
  const [expanded, setExpanded] = useState(false)

  // Extract useful preview from arguments
  const getArgPreview = () => {
    const args = toolCall.arguments
    if (args.pattern) return `"${String(args.pattern).slice(0, 30)}${String(args.pattern).length > 30 ? '...' : ''}"`
    if (args.file_path) {
      const path = String(args.file_path)
      return path.split('/').pop() || path.slice(-30)
    }
    if (args.query) return `"${String(args.query).slice(0, 25)}${String(args.query).length > 25 ? '...' : ''}"`
    return null
  }

  const preview = getArgPreview()

  return (
    <div className="py-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-text-muted hover:text-text-body"
      >
        <span className="text-info/50">↳</span>
        <span className="text-info/70 font-mono">{toolCall.tool_name}</span>
        {preview && <span className="truncate opacity-60 max-w-[200px]">{preview}</span>}
        <svg className={`w-2.5 h-2.5 text-text-muted/50 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="ml-4 mt-1 p-2 bg-bg-page rounded text-xs max-h-24 overflow-auto">
          <ArgsTable args={toolCall.arguments} />
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
const RunningEvent = ({
  event,
  showCursor,
  subagentActivities,
}: {
  event: StepEvent
  showCursor: boolean
  subagentActivities?: Record<string, SubagentActivity>
}) => {
  if (event.type === 'tool_call') {
    // Look up subagent activity by tool_use_id
    const subagentActivity = event.tool_use_id && subagentActivities
      ? subagentActivities[event.tool_use_id]
      : undefined
    return (
      <ToolCallItem
        tool={event.tool}
        args={event.arguments}
        isRunning
        subagentActivity={subagentActivity}
      />
    )
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
  totalSteps?: number  // Total steps in pipeline (for restart dropdown)
  subagentActivities?: Record<string, SubagentActivity>  // parent_tool_use_id -> SubagentActivity (for this step)
}

export default function StepCard({
  step,
  pipelineId,
  isActive,
  stepEvents = [],
  completedEvents = [],
  completedOutput = '',
  completedToolCalls = [],
  totalSteps = 8,
  subagentActivities = {},
}: StepCardProps) {
  const [expanded, setExpanded] = useState(isActive)
  const [showRecovery, setShowRecovery] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new events arrive during running state
  useEffect(() => {
    if (step.status === 'running' && expanded && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [stepEvents, step.status, expanded])

  // Auto-close recovery options when step is no longer failed/paused (e.g., pipeline retried)
  useEffect(() => {
    if (showRecovery && step.status !== 'failed' && step.status !== 'paused') {
      setShowRecovery(false)
    }
  }, [step.status, showRecovery])

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
      case 'skipped':
        return 'step-card--skipped'
      case 'waiting':
        return 'step-card--waiting'
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
      case 'skipped':
        return (
          <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        )
      case 'waiting':
        return (
          <svg className="w-5 h-5 text-info animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      default:
        return <div className="status-dot status-dot--pending" />
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
          {/* Cost info */}
          {step.tokens_used > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-text-muted">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {step.tokens_used.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 font-mono text-text-muted">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ${step.cost.toFixed(4)}
              </span>
            </div>
          )}
          {step.status === 'running' && (
            <span className="text-xs px-2 py-0.5 bg-info/20 text-primary-dark rounded-full animate-pulse">
              Running
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
                    subagentActivities={subagentActivities}
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

            {/* Show message for skipped steps */}
            {step.status === 'skipped' && (
              <p className="text-text-muted text-sm italic text-center py-4">
                Step was skipped
              </p>
            )}

            {/* Show message for waiting steps */}
            {step.status === 'waiting' && (
              <p className="text-info text-sm italic text-center py-4">
                Waiting for clarification...
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

          {/* Recovery Options for failed/paused steps */}
          {(step.status === 'failed' || step.status === 'paused') && !showRecovery && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowRecovery(true)
                }}
                className="btn btn-primary text-xs py-1.5 px-3"
              >
                Recovery Options
              </button>
            </div>
          )}

          {/* Recovery Options Panel */}
          {showRecovery && (
            <RecoveryOptions
              pipelineId={pipelineId}
              stepNumber={step.step_number}
              stepName={step.step_name}
              totalSteps={totalSteps}
              onClose={() => setShowRecovery(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
