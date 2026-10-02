import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartColors } from './useChartColors'
import { CATEGORY_LABELS } from '../../lib/constants'

interface CategoryBarsProps {
  data: Array<{ category: string; n: number }>
  height?: number
}

/** Findings by evidence category (horizontal bars). */
export function CategoryBars({ data, height = 200 }: CategoryBarsProps) {
  const c = useChartColors()
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis
            type="category"
            dataKey="category"
            width={104}
            tick={{ fill: c.text3, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => CATEGORY_LABELS[v as keyof typeof CATEGORY_LABELS] ?? v}
          />
          <Tooltip
            cursor={{ fill: 'rgba(128,128,128,0.06)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0]
              return (
                <div className="rounded-md border border-border bg-raised px-2.5 py-1.5 font-mono text-[11px] shadow-lg">
                  <span className="text-ink-3">{CATEGORY_LABELS[item.payload.category as keyof typeof CATEGORY_LABELS] ?? item.payload.category}</span>{' '}
                  <span className="text-accent tnum">{item.value}</span>
                </div>
              )
            }}
          />
          <Bar dataKey="n" fill={c.info} barSize={10} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
