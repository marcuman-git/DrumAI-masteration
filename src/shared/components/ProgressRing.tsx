interface ProgressRingProps {
  value: number
  size?: number
  stroke?: number
  label: string
}

export function ProgressRing({ value, size = 112, stroke = 10, label }: ProgressRingProps) {
  const radius = (size - stroke) / 2
  const circumference = radius * Math.PI * 2
  const dashOffset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="stroke-white/10"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-cyan-300"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="-mt-[4.5rem] text-center">
        <p className="text-xl font-semibold text-zinc-50">{value}%</p>
      </div>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}
