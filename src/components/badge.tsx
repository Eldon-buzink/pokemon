import { cn } from '@/lib/utils'

interface BadgeProps {
  type: 'HOT' | 'GRADE_EV' | 'MOMENTUM' | 'VINTAGE' | 'EARLY'
  className?: string
}

const badgeConfig = {
  HOT: {
    icon: '🔥',
    label: 'HOT',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  GRADE_EV: {
    icon: '💎',
    label: 'GRADE EV',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  MOMENTUM: {
    icon: '📈',
    label: 'MOMENTUM',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  VINTAGE: {
    icon: '⭐',
    label: 'VINTAGE',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  EARLY: {
    icon: '🧪',
    label: 'EARLY',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
}

export function Badge({ type, className }: BadgeProps) {
  const config = badgeConfig[type]
  
  if (!config) {
    console.warn(`Unknown badge type: ${type}`)
    return null
  }
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border',
        config.className,
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

export function BadgeList({ badges }: { badges: string[] }) {
  if (badges.length === 0) return null
  
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge, index) => (
        <Badge key={index} type={badge as 'HOT' | 'GRADE_EV' | 'MOMENTUM' | 'VINTAGE' | 'EARLY'} />
      ))}
    </div>
  )
}
