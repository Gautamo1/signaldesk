import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors } from './useChartColors'

interface TrendAreaProps {
  data: Array<{ date: string; count: number }>
  height?: number
}

/** Findings volume over the last 14 days. */
export function TrendArea({ data, height = 200 }: TrendAreaProps) {
  const c = useChartColors()
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -26 }}>
          <defs>
            <linearGradient id="sd-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.3} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: c.text3, fontSize: 10, fontFamily: 'JetBrains Mono Variable, monospace' }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            tickFormatter={(d: string) => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: c.text3, fontSize: 10, fontFamily: 'JetBrains Mono Variable, monospace' }}
            tickLine={false}
            axisLine={false}
            width={46}
          />
          <Tooltip
            cursor={{ stroke: c.grid }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-md border border-border bg-raised px-2.5 py-1.5 font-mono text-[11px] shadow-lg">
                  <span className="text-ink-3">{label}</span>{' '}
                  <span className="text-accent tnum">{payload[0].value} findings</span>
                </div>
              )
            }}
          />
          <Area type="monotone" dataKey="count" stroke={c.accent} strokeWidth={1.5} fill="url(#sd-area)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
