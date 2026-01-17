import type { PipelineStatus } from '../types'

interface PipelineControlsProps {
  status: PipelineStatus
  onStart: () => void
  onPause: () => void
  onResume: () => void
}

export default function PipelineControls({
  status,
  onStart,
  onPause,
  onResume,
}: PipelineControlsProps) {
  if (status === 'pending') {
    return (
      <button onClick={onStart} className="btn btn-primary">
        Start
      </button>
    )
  }

  if (status === 'running') {
    return (
      <button onClick={onPause} className="btn btn-secondary">
        Pause
      </button>
    )
  }

  if (status === 'paused') {
    return (
      <button onClick={onResume} className="btn btn-resume">
        Resume
      </button>
    )
  }

  if (status === 'completed') {
    return (
      <span className="flex items-center gap-2 text-success font-mono text-sm uppercase">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Completed
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-error font-mono text-sm uppercase">Failed</span>
        <button onClick={onStart} className="btn btn-secondary text-sm py-2 px-4">
          Retry
        </button>
      </div>
    )
  }

  if (status === 'waiting_for_review') {
    return (
      <span className="flex items-center gap-2 text-info font-mono text-sm uppercase">
        <div className="w-2 h-2 rounded-full bg-info animate-pulse" />
        Waiting for Review
      </span>
    )
  }

  return null
}
