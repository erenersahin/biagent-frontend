interface StatsCardProps {
  label: string
  value: number
  color?: 'success' | 'warning' | 'error' | 'info'
}

export default function StatsCard({ label, value, color }: StatsCardProps) {
  const getColorClass = () => {
    switch (color) {
      case 'success':
        return 'text-success'
      case 'warning':
        return 'text-yellow-500'
      case 'error':
        return 'text-error'
      case 'info':
        return 'text-info'
      default:
        return 'text-text-heading'
    }
  }

  return (
    <div className="card text-center">
      <p className={`text-3xl font-medium mb-1 ${getColorClass()}`}>{value}</p>
      <p className="text-sm text-text-muted uppercase font-mono tracking-wider">
        {label}
      </p>
    </div>
  )
}
