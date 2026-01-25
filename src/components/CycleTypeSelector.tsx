/**
 * CycleTypeSelector - Modal for selecting cycle type when starting a pipeline
 */
import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import type { CycleType } from '../types'

interface CycleTypeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (cycleType: string) => void
  ticketKey: string
}

const CYCLE_ICONS: Record<string, string> = {
  backend: '⚙️',
  frontend: '🎨',
  fullstack: '🔗',
  spike: '🔍',
  oncall_bug: '🐛',
}

export function CycleTypeSelector({
  isOpen,
  onClose,
  onSelect,
  ticketKey,
}: CycleTypeSelectorProps) {
  const { cycleTypes, fetchCycleTypes } = useStore()
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && cycleTypes.length === 0) {
      fetchCycleTypes()
    }
  }, [isOpen, cycleTypes.length, fetchCycleTypes])

  if (!isOpen) return null

  const handleSelect = (cycleType: CycleType) => {
    setSelected(cycleType.name)
  }

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-xl font-semibold text-white mb-2">
          Select Cycle Type
        </h2>
        <p className="text-dark-300 text-sm mb-4">
          Choose the type of work for {ticketKey}
        </p>

        <div className="space-y-2 mb-6">
          {cycleTypes.map((cycleType) => (
            <button
              key={cycleType.id}
              onClick={() => handleSelect(cycleType)}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                selected === cycleType.name
                  ? 'border-primary bg-primary/10'
                  : 'border-dark-600 hover:border-dark-400 bg-dark-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {CYCLE_ICONS[cycleType.name] || cycleType.icon || '📋'}
                </span>
                <div>
                  <div className="font-medium text-white">
                    {cycleType.display_name}
                  </div>
                  {cycleType.description && (
                    <div className="text-sm text-dark-300 mt-1">
                      {cycleType.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selected
                ? 'bg-primary text-dark-900 hover:bg-primary/90'
                : 'bg-dark-600 text-dark-400 cursor-not-allowed'
            }`}
          >
            Start Pipeline
          </button>
        </div>
      </div>
    </div>
  )
}
