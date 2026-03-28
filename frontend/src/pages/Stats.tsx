import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { PageShell } from '../components/layout/PageShell'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { useDashboard } from '../hooks/useDashboard'

export function Stats() {
  const { stats, momentum, cognitive, loading } = useDashboard()

  const cogData = Object.entries(cognitive).slice(-14).map(([date, v]) => ({
    date: date.slice(5),
    deep: Math.round(v.deep / 60),
    shallow: Math.round(v.shallow / 60),
    distraction: Math.round(v.distraction / 60),
  }))

  return (
    <PageShell>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="font-display font-bold text-2xl text-text mb-6">Stats</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            [
              { label: 'Total Focus Hours', value: `${stats?.total_focus_hours ?? 0}h` },
              { label: 'Sessions This Week', value: stats?.sessions_this_week ?? 0 },
              { label: 'Avg Momentum', value: stats?.avg_momentum ?? 0 },
              { label: 'Tasks Completed', value: stats?.tasks_completed ?? 0 },
            ].map((s) => (
              <Card key={s.label}>
                <p className="text-xs text-muted font-mono mb-1">{s.label}</p>
                <p className="font-display font-bold text-2xl text-text">{s.value}</p>
              </Card>
            ))
          )}
        </div>

        {/* Momentum over time */}
        {momentum.length > 0 && (
          <Card className="mb-6">
            <h2 className="font-display font-semibold text-text mb-4">Momentum Over Time</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={momentum}>
                <XAxis dataKey="date" tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#e2e2f0' }} />
                <Line type="monotone" dataKey="score" stroke="#7c5cfc" strokeWidth={2} dot={{ fill: '#7c5cfc', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Cognitive breakdown */}
        {cogData.length > 0 && (
          <Card>
            <h2 className="font-display font-semibold text-text mb-4">Cognitive Breakdown (minutes/day)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cogData}>
                <XAxis dataKey="date" tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#e2e2f0' }} />
                <Bar dataKey="deep" fill="#7c5cfc" radius={[4, 4, 0, 0]} name="Deep Work" />
                <Bar dataKey="shallow" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Shallow Work" />
                <Bar dataKey="distraction" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Distraction" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </PageShell>
  )
}
