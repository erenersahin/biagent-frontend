import { useState } from 'react'
import type { RiskCard, RiskSeverity } from '../types'

interface RiskAnalysisCardsProps {
  risks: RiskCard[]
  onAcknowledge?: (riskId: string) => Promise<void>
  onResolve?: (riskId: string, notes: string) => Promise<void>
}

const severityColors: Record<RiskSeverity, { bg: string; border: string; text: string; badge: string }> = {
  high: {
    bg: 'bg-red-900/20',
    border: 'border-red-500/50',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30'
  },
  medium: {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  },
  low: {
    bg: 'bg-blue-900/20',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }
}

const categoryIcons: Record<string, string> = {
  technical: '\u2699\uFE0F',
  security: '\uD83D\uDD12',
  performance: '\u26A1',
  dependency: '\uD83D\uDD17',
  testing: '\uD83E\uDDEA',
  blocker: '\uD83D\uDED1'
}

export function RiskAnalysisCards({ risks, onAcknowledge, onResolve }: RiskAnalysisCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  if (risks.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No risks identified
      </div>
    )
  }

  // Group by severity
  const highRisks = risks.filter(r => r.severity === 'high')
  const mediumRisks = risks.filter(r => r.severity === 'medium')
  const lowRisks = risks.filter(r => r.severity === 'low')

  const handleAcknowledge = async (riskId: string) => {
    if (!onAcknowledge) return
    setLoading(prev => ({ ...prev, [riskId]: true }))
    try {
      await onAcknowledge(riskId)
    } finally {
      setLoading(prev => ({ ...prev, [riskId]: false }))
    }
  }

  const handleResolve = async (riskId: string) => {
    if (!onResolve) return
    setLoading(prev => ({ ...prev, [riskId]: true }))
    try {
      await onResolve(riskId, resolutionNotes[riskId] || '')
    } finally {
      setLoading(prev => ({ ...prev, [riskId]: false }))
    }
  }

  const renderRiskCard = (risk: RiskCard) => {
    const colors = severityColors[risk.severity]
    const isExpanded = expandedId === risk.id
    const isLoading = loading[risk.id]

    return (
      <div
        key={risk.id}
        className={`${colors.bg} ${colors.border} border rounded-lg p-4 transition-all ${
          risk.resolved ? 'opacity-60' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colors.badge}`}>
                {risk.severity.toUpperCase()}
              </span>
              <span className="text-xs text-gray-400">
                {categoryIcons[risk.category] || ''} {risk.category}
              </span>
              {risk.is_blocker && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-600/30 text-red-300 border border-red-500/30">
                  BLOCKER
                </span>
              )}
              {risk.resolved && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-600/30 text-green-300 border border-green-500/30">
                  RESOLVED
                </span>
              )}
              {risk.acknowledged && !risk.resolved && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-600/30 text-gray-300 border border-gray-500/30">
                  ACKNOWLEDGED
                </span>
              )}
            </div>
            <h4 className={`font-medium ${colors.text}`}>{risk.title}</h4>
            <p className="text-sm text-gray-300 mt-1">{risk.description}</p>
          </div>
          <button
            onClick={() => setExpandedId(isExpanded ? null : risk.id)}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
            {risk.impact && (
              <div>
                <h5 className="text-xs font-medium text-gray-400 uppercase mb-1">Impact</h5>
                <p className="text-sm text-gray-300">{risk.impact}</p>
              </div>
            )}
            {risk.mitigation && (
              <div>
                <h5 className="text-xs font-medium text-gray-400 uppercase mb-1">Mitigation</h5>
                <p className="text-sm text-gray-300">{risk.mitigation}</p>
              </div>
            )}
            {risk.resolved && risk.resolution_notes && (
              <div>
                <h5 className="text-xs font-medium text-green-400 uppercase mb-1">Resolution</h5>
                <p className="text-sm text-gray-300">{risk.resolution_notes}</p>
              </div>
            )}

            {!risk.resolved && (
              <div className="flex flex-col gap-2 pt-2">
                {!risk.acknowledged && onAcknowledge && (
                  <button
                    onClick={() => handleAcknowledge(risk.id)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Acknowledging...' : 'Acknowledge Risk'}
                  </button>
                )}
                {risk.acknowledged && onResolve && (
                  <>
                    <textarea
                      placeholder="Resolution notes (optional)"
                      value={resolutionNotes[risk.id] || ''}
                      onChange={(e) => setResolutionNotes(prev => ({ ...prev, [risk.id]: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 resize-none"
                      rows={2}
                    />
                    <button
                      onClick={() => handleResolve(risk.id)}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Resolving...' : 'Mark as Resolved'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          {risks.length} risk{risks.length !== 1 ? 's' : ''} identified
        </span>
        {highRisks.length > 0 && (
          <span className={severityColors.high.text}>
            {highRisks.length} high
          </span>
        )}
        {mediumRisks.length > 0 && (
          <span className={severityColors.medium.text}>
            {mediumRisks.length} medium
          </span>
        )}
        {lowRisks.length > 0 && (
          <span className={severityColors.low.text}>
            {lowRisks.length} low
          </span>
        )}
      </div>

      {/* Risk cards grouped by severity */}
      {highRisks.length > 0 && (
        <div className="space-y-2">
          {highRisks.map(renderRiskCard)}
        </div>
      )}
      {mediumRisks.length > 0 && (
        <div className="space-y-2">
          {mediumRisks.map(renderRiskCard)}
        </div>
      )}
      {lowRisks.length > 0 && (
        <div className="space-y-2">
          {lowRisks.map(renderRiskCard)}
        </div>
      )}
    </div>
  )
}
