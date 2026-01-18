import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { formatDistanceToNow } from 'date-fns'

export default function Header() {
  const lastSynced = useStore((state) => state.lastSynced)

  return (
    <header className="bg-primary-dark text-primary px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <svg
            className="w-8 h-8"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="32" height="32" rx="6" fill="#202020" />
            <circle cx="10" cy="16" r="4" fill="#F0FB29" />
            <circle cx="22" cy="16" r="4" fill="#F0FB29" />
            <rect x="14" y="15" width="4" height="2" fill="#F0FB29" />
          </svg>
          <span className="font-mono font-medium text-lg tracking-wider">BIAGENT</span>
        </Link>

        <div className="flex items-center gap-6">
          {lastSynced && (
            <span className="text-sm text-text-muted">
              Synced {formatDistanceToNow(new Date(lastSynced), { addSuffix: true })}
            </span>
          )}

          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className="font-mono text-sm uppercase tracking-wider hover:text-white transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
