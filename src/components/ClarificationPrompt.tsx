import { useState } from 'react'
import { useStore } from '../lib/store'
import * as api from '../lib/api'

interface Props {
  pipelineId: string
}

export default function ClarificationPrompt({ pipelineId: _pipelineId }: Props) {
  const pendingClarification = useStore((state) => state.pendingClarification)
  const clearPendingClarification = useStore((state) => state.clearPendingClarification)

  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [customAnswer, setCustomAnswer] = useState('')
  const [isOther, setIsOther] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!pendingClarification) {
    return null
  }

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index)
    setIsOther(false)
    setCustomAnswer('')
  }

  const handleOtherSelect = () => {
    setSelectedOption(null)
    setIsOther(true)
  }

  const handleSubmit = async () => {
    if (selectedOption === null && !isOther) {
      setError('Please select an option')
      return
    }

    if (isOther && !customAnswer.trim()) {
      setError('Please provide your answer')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await api.answerClarification(
        pendingClarification.id,
        isOther ? undefined : selectedOption ?? undefined,
        isOther ? customAnswer.trim() : undefined
      )
      clearPendingClarification()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card border-2 border-primary bg-primary/5">
      {/* Header */}
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
          <h3 className="text-h5 text-primary">Agent Needs Clarification</h3>
          <p className="text-sm text-text-muted">
            Step {pendingClarification.stepNumber} has a question for you
          </p>
        </div>
      </div>

      {/* Context if provided */}
      {pendingClarification.context && (
        <div className="mb-4 p-3 bg-surface rounded-lg text-sm text-text-muted">
          {pendingClarification.context}
        </div>
      )}

      {/* Question */}
      <div className="mb-4">
        <p className="text-body font-medium">{pendingClarification.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {pendingClarification.options.map((option, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleOptionSelect(index)}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
              selectedOption === index
                ? 'border-primary bg-primary/10 text-text'
                : 'border-border bg-surface hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedOption === index
                    ? 'border-primary bg-primary'
                    : 'border-border'
                }`}
              >
                {selectedOption === index && (
                  <svg
                    className="w-3 h-3 text-background"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm">{option}</span>
            </div>
          </button>
        ))}

        {/* Other option */}
        <button
          type="button"
          onClick={handleOtherSelect}
          className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
            isOther
              ? 'border-primary bg-primary/10 text-text'
              : 'border-border bg-surface hover:border-primary/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isOther ? 'border-primary bg-primary' : 'border-border'
              }`}
            >
              {isOther && (
                <svg
                  className="w-3 h-3 text-background"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className="text-sm">Other (provide custom answer)</span>
          </div>
        </button>
      </div>

      {/* Custom answer text area */}
      {isOther && (
        <div className="mb-4">
          <textarea
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
            placeholder="Enter your custom answer..."
            value={customAnswer}
            onChange={(e) => setCustomAnswer(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting || (selectedOption === null && !isOther)}
        >
          {submitting ? 'Submitting...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
