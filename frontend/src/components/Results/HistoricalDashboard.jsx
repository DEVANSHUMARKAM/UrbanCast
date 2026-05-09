import { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import MapView from '../Map/MapView'

const TREND_CONFIG = {
  increasing: { label: 'Urbanizing',  bs: 'danger',  icon: '📈' },
  stable:     { label: 'Stable',      bs: 'warning', icon: '➡️' },
  decreasing: { label: 'Recovering',  bs: 'success', icon: '📉' },
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-3 shadow-sm px-3 py-2 small">
      <strong style={{ color: '#14532d' }}>{label}</strong>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}
          {p.name === 'Urban %' ? '%' : ''}
        </div>
      ))}
    </div>
  )
}

export default function HistoricalDashboard({ result, coords, onBack }) {
  const { time_series, predictions, summary, grid_info } = result

  const trend = TREND_CONFIG[summary.trend] ?? TREND_CONFIG.stable

  const STAT_CARDS = [
    {
      icon: '📅', label: 'Period Analysed',
      value: `${summary.start_year} – ${summary.end_year}`,
      sub: `${summary.years_analyzed} Landsat scenes`,
      bg: '#dcfce7', border: '#86efac',
    },
    {
      icon: '🏙️', label: 'Urban Area Change',
      value: `${summary.urban_pct_start}% → ${summary.urban_pct_end}%`,
      sub: `${summary.change_pct > 0 ? '+' : ''}${summary.change_pct}% change`,
      bg: summary.change_pct > 5 ? '#fee2e2' : '#dcfce7',
      border: summary.change_pct > 5 ? '#fca5a5' : '#86efac',
    },
    {
      icon: '📊', label: 'NDBI Change',
      value: `${summary.ndbi_start} → ${summary.ndbi_end}`,
      sub: `${summary.ndbi_change > 0 ? '+' : ''}${summary.ndbi_change} total shift`,
      bg: '#dcfce7', border: '#86efac',
    },
    {
      icon: '🌿', label: 'Vegetation Loss',
      value: `${summary.ndvi_start} → ${summary.ndvi_end}`,
      sub: `NDVI declined ${Math.abs(
        round2(summary.ndvi_end - summary.ndvi_start)
      )} points`,
      bg: '#dcfce7', border: '#86efac',
    },
    {
      icon: trend.icon, label: 'Trend',
      value: trend.label,
      sub: summary.change_pct > 0
        ? `+${summary.change_pct}% built-up growth`
        : `${summary.change_pct}% change`,
      bg: summary.trend === 'increasing' ? '#fee2e2' : '#dcfce7',
      border: summary.trend === 'increasing' ? '#fca5a5' : '#86efac',
    },
    {
      icon: '📐', label: 'Grid Coverage',
      value: `${grid_info.total_cells} cells`,
      sub: `${grid_info.cell_size_m}m × ${grid_info.cell_size_m}m each`,
      bg: '#dcfce7', border: '#86efac',
    },
  ]

  // Chart data
  const trendData = time_series.map(d => ({
    year:      d.year,
    'NDBI':    d.ndbi_mean,
    'NDVI':    d.ndvi_mean,
    'Urban %': d.urban_pct,
  }))

  const sceneData = time_series.map(d => ({
    year:          d.year,
    'Urban %':     d.urban_pct,
    'Cloud cover': d.cloud_cover,
    scene:         d.scene_date,
  }))

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh', background: '#f0fdf4' }}>

      {/* ── Navbar ── */}
      <nav className="navbar navbar-dark px-3 py-2"
        style={{ background: 'linear-gradient(90deg,#14532d,#15803d)', minHeight: 52 }}>
        <button className="btn btn-sm me-3 fw-medium"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onClick={onBack}>
          ← Back to Map
        </button>
        <span className="navbar-brand mb-0 fw-bold">🌿 UrbanGrowth</span>
        <span className="ms-1 small" style={{ color: '#86efac' }}>
          / Historical Analysis Dashboard
        </span>
        <span className={`ms-auto badge bg-${trend.bs} rounded-pill`}>
          {trend.icon} {trend.label} Trend
        </span>
      </nav>

      <div className="container-fluid py-4 px-4">

        {/* ── Stat cards ── */}
        <div className="row g-3 mb-4 anim-fadeinup">
          {STAT_CARDS.map(({ icon, label, value, sub, bg, border }) => (
            <div className="col-6 col-md-4 col-lg-2" key={label}>
              <div className="card border-0 rounded-4 h-100 shadow-sm"
                style={{ background: bg, borderLeft: `4px solid ${border}` }}>
                <div className="card-body p-3">
                  <div style={{ fontSize: 22 }}>{icon}</div>
                  <div className="small text-muted mt-1">{label}</div>
                  <div className="fw-bold" style={{ fontSize: 15, color: '#14532d' }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#4b7c5a' }}>{sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Map + NDBI/NDVI chart ── */}
        <div className="row g-3 mb-4 anim-fadeinup anim-delay-1">

          {/* Map */}
          <div className="col-lg-7">
            <div className="card border-0 rounded-4 shadow-sm overflow-hidden"
              style={{ height: 440 }}>
              <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-2 px-3">
                <span style={{ fontSize: 16 }}>🗺️</span>
                <span className="fw-semibold small" style={{ color: '#14532d' }}>
                  NDBI Grid — {summary.end_year} (Latest Year)
                </span>
                <div className="ms-auto d-flex gap-3">
                  {[
                    ['High NDBI',   '#ef4444'],
                    ['Medium',      '#fbbf24'],
                    ['Vegetation',  '#4ade80'],
                  ].map(([l, c]) => (
                    <span key={l} className="d-flex align-items-center gap-1"
                      style={{ fontSize: 11, color: '#4b7c5a' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2,
                        background: c, display: 'inline-block' }} />
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <MapView
                onPolygonDrawn={() => {}}
                predictions={predictions}
                drawnCoords={coords}
                readOnly
              />
            </div>
          </div>

          {/* NDBI + NDVI dual line chart */}
          <div className="col-lg-5">
            <div className="card border-0 rounded-4 shadow-sm h-100">
              <div className="card-header bg-white border-bottom py-2 px-3">
                <span className="fw-semibold small" style={{ color: '#14532d' }}>
                  📈 NDBI vs NDVI Trend
                </span>
                <span className="text-muted small ms-2">
                  Built-up index vs Vegetation index
                </span>
              </div>
              <div className="card-body p-2 d-flex flex-column justify-content-center">
                <div className="small text-muted px-2 mb-2">
                  <span style={{ color: '#dc2626' }}>■</span> NDBI rising = more built-up &nbsp;
                  <span style={{ color: '#16a34a' }}>■</span> NDVI falling = less vegetation
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}
                    margin={{ top: 4, right: 16, bottom: 4, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                    <Legend iconType="circle" iconSize={10} />
                    <Line type="monotone" dataKey="NDBI"
                      stroke="#dc2626" strokeWidth={2.5}
                      dot={{ r: 4, fill: '#dc2626' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="NDVI"
                      stroke="#16a34a" strokeWidth={2.5}
                      dot={{ r: 4, fill: '#16a34a' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>

                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={sceneData}
                    margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Urban %" fill="#15803d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ── Year-by-year table ── */}
        <div className="card border-0 rounded-4 shadow-sm mb-4 anim-fadeinup anim-delay-2">
          <div className="card-header bg-white border-bottom py-2 px-3">
            <span className="fw-semibold small" style={{ color: '#14532d' }}>
              🛰️ Year-by-Year Landsat Analysis
            </span>
            <span className="text-muted small ms-2">
              One scene per year — least cloudy available
            </span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0" style={{ fontSize: 13 }}>
              <thead style={{ background: '#f0fdf4' }}>
                <tr>
                  {['Year', 'Scene Date', 'Cloud Cover', 'NDBI', 'NDVI',
                    'Urban %', 'Built-up Trend'].map(h => (
                    <th key={h} className="px-3 py-2"
                      style={{ color: '#4b7c5a', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {time_series.map((row, i) => {
                  const prev       = time_series[i - 1]
                  const ndbiChange = prev ? row.ndbi_mean - prev.ndbi_mean : 0
                  const isFirst    = i === 0
                  return (
                    <tr key={row.year}>
                      <td className="px-3 py-2 fw-semibold" style={{ color: '#14532d' }}>
                        {row.year}
                        {i === time_series.length - 1 && (
                          <span className="badge bg-primary ms-2 rounded-pill"
                            style={{ fontSize: 10 }}>latest</span>
                        )}
                      </td>
                      <td className="font-monospace small text-muted">{row.scene_date}</td>
                      <td>
                        <span className={`badge rounded-pill ${
                          row.cloud_cover < 10 ? 'bg-success' :
                          row.cloud_cover < 25 ? 'bg-warning' : 'bg-danger'
                        }`}>
                          {row.cloud_cover}%
                        </span>
                      </td>
                      <td className="fw-semibold"
                        style={{ color: row.ndbi_mean > 0 ? '#dc2626' : '#16a34a' }}>
                        {row.ndbi_mean}
                      </td>
                      <td className="fw-semibold" style={{ color: '#15803d' }}>
                        {row.ndvi_mean}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress rounded-pill" style={{ width: 55, height: 6 }}>
                            <div className="progress-bar"
                              style={{
                                width: `${row.urban_pct}%`,
                                background: row.urban_pct > 40 ? '#dc2626' :
                                            row.urban_pct > 20 ? '#d97706' : '#16a34a',
                              }} />
                          </div>
                          <span className="small fw-semibold">{row.urban_pct}%</span>
                        </div>
                      </td>
                      <td>
                        {isFirst ? (
                          <span className="text-muted small">baseline</span>
                        ) : (
                          <span className={`badge rounded-pill ${
                            ndbiChange > 0.01 ? 'bg-danger' :
                            ndbiChange < -0.01 ? 'bg-success' : 'bg-secondary'
                          }`}>
                            {ndbiChange > 0 ? '▲' : ndbiChange < 0 ? '▼' : '–'}
                            {' '}{Math.abs(ndbiChange).toFixed(4)}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

function round2(n) { return Math.round(n * 100) / 100 }