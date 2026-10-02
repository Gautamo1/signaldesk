interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  className?: string
}

/** Dependency-free SVG sparkline for stat tiles. */
export function Sparkline({ data, width = 96, height = 28, className }: SparklineProps) {
  const accent = 'var(--sd-accent)'
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const step = data.length > 1 ? width / (data.length - 1) : width
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - (v / max) * (height - 8)).toFixed(1)}`)
  const areaPoints = `0,${height} ${points.join(' ')} ${width},${height}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <polygon points={areaPoints} fill={accent} opacity="0.12" />
      <polyline points={points.join(' ')} fill="none" stroke={accent} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) * step}
          cy={height - 3 - (data[data.length - 1] / max) * (height - 8)}
          r="2"
          fill={accent}
        />
      )}
    </svg>
  )
}
