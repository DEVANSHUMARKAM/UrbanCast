import { useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import MapView from '../Map/MapView'

const HIGH_COLOR   = '#dc2626'
const MEDIUM_COLOR = '#f97316'
const LOW_COLOR    = '#16a34a'

// ── Analytics helpers ─────────────────────────────────────────────────────────

function getDistanceBands(predictions) {
  const bands = [
    { label: '0–2 km', min: 0, max: 2 },
    { label: '2–4 km', min: 2, max: 4 },
    { label: '4–6 km', min: 4, max: 6 },
    { label: '6–8 km', min: 6, max: 8 },
    { label: '8+ km',  min: 8, max: Infinity },
  ]
  return bands.map(b => {
    const cells = predictions.filter(p =>
      p.features.dist_center_km >= b.min && p.features.dist_center_km < b.max
    )
    const avg = cells.length
      ? cells.reduce((s, p) => s + p.probability, 0) / cells.length : 0
    return { name: b.label, Probability: Math.round(avg * 100), cells: cells.length }
  }).filter(b => b.cells > 0)
}

function getDirections(predictions) {
  const avgLat = predictions.reduce((s, p) => s + p.center[0], 0) / predictions.length
  const avgLng = predictions.reduce((s, p) => s + p.center[1], 0) / predictions.length
  const dirs = { North: [], South: [], East: [], West: [] }
  predictions.forEach(p => {
    const dlat = p.center[0] - avgLat
    const dlng = p.center[1] - avgLng
    if (Math.abs(dlat) >= Math.abs(dlng))
      dlat > 0 ? dirs.North.push(p.probability) : dirs.South.push(p.probability)
    else
      dlng > 0 ? dirs.East.push(p.probability) : dirs.West.push(p.probability)
  })
  return Object.entries(dirs)
    .map(([dir, probs]) => ({
      name: dir,
      Probability: probs.length
        ? Math.round(probs.reduce((a, b) => a + b, 0) / probs.length * 100) : 0,
      cells: probs.length,
    }))
    .sort((a, b) => b.Probability - a.Probability)
}

function getRoadProximity(predictions) {
  const groups = [
    { label: '< 0.5 km', min: 0,   max: 0.5 },
    { label: '0.5–1 km', min: 0.5, max: 1   },
    { label: '1–2 km',   min: 1,   max: 2   },
    { label: '> 2 km',   min: 2,   max: Infinity },
  ]
  return groups.map(g => {
    const cells = predictions.filter(p => {
      const d = p.features.dist_road_km
      return d !== null && d >= g.min && d < g.max
    })
    const avg = cells.length
      ? cells.reduce((s, p) => s + p.probability, 0) / cells.length : 0
    return { name: g.label, Probability: Math.round(avg * 100), cells: cells.length }
  }).filter(g => g.cells > 0)
}

function getTopZones(predictions) {
  return [...predictions].sort((a, b) => b.probability - a.probability).slice(0, 10)
}

// ── Custom recharts tooltip ───────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-3 shadow-sm px-3 py-2 small">
      <strong style={{ color: '#14532d' }}>{label}</strong>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill }}>
          {p.value}% probability
        </div>
      ))}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ result, coords, onBack }) {
  const { predictions, summary, city, roads, grid } = result

  const distanceBands = useMemo(() => getDistanceBands(predictions), [predictions])
  const directions    = useMemo(() => getDirections(predictions),    [predictions])
  const roadProximity = useMemo(() => getRoadProximity(predictions), [predictions])
  const topZones      = useMemo(() => getTopZones(predictions),      [predictions])

  const pieData = [
    { name: 'High',   value: summary.high,   fill: HIGH_COLOR   },
    { name: 'Medium', value: summary.medium,  fill: MEDIUM_COLOR },
    { name: 'Low',    value: summary.low,     fill: LOW_COLOR    },
  ]

  const dominantDir = directions[0]?.name ?? 'N/A'
  const growthBs    = summary.high_pct > 40 ? 'danger' : summary.high_pct > 20 ? 'warning' : 'success'
  const growthLabel = summary.high_pct > 40 ? 'High'  : summary.high_pct > 20 ? 'Moderate' : 'Low'

  const STAT_CARDS = [
    { icon: '🏙️', label: 'City Detected',     value: city.name,
      sub: city.state,                          bg: '#dcfce7', border: '#86efac' },
    { icon: '📊', label: 'Total Cells',        value: grid.total_cells.toLocaleString(),
      sub: `${grid.cell_size_m}m grid size`,    bg: '#dcfce7', border: '#86efac' },
    { icon: '🔴', label: 'High Growth',        value: `${summary.high_pct}%`,
      sub: `${summary.high} cells`,             bg: '#fee2e2', border: '#fca5a5' },
    { icon: '🟡', label: 'Medium Growth',      value: `${summary.medium_pct}%`,
      sub: `${summary.medium} cells`,           bg: '#fef9c3', border: '#fde047' },
    { icon: '🧭', label: 'Primary Direction',  value: dominantDir,
      sub: `${directions[0]?.Probability ?? 0}% avg probability`, bg: '#dcfce7', border: '#86efac' },
    { icon: '🛣️', label: 'Roads Found',        value: roads.road_count.toLocaleString(),
      sub: `${roads.segment_count.toLocaleString()} segments`,    bg: '#dcfce7', border: '#86efac' },
  ]

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
        <span className="ms-1 small" style={{ color: '#86efac' }}>/ Results Dashboard</span>
        <span className={`ms-auto badge bg-${growthBs} rounded-pill`}>
          {growthLabel} Urbanization Zone
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
                  <div className="fw-bold" style={{ fontSize: 18, color: '#14532d' }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#4b7c5a' }}>{sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Map + right charts ── */}
        <div className="row g-3 mb-4 anim-fadeinup anim-delay-1">

          {/* Map */}
          <div className="col-lg-7">
            <div className="card border-0 rounded-4 shadow-sm overflow-hidden"
              style={{ height: 440 }}>
              <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-2 px-3">
                <span style={{ fontSize: 16 }}>🗺️</span>
                <span className="fw-semibold small" style={{ color: '#14532d' }}>
                  Urbanization Grid Map
                </span>
                <div className="ms-auto d-flex gap-3">
                  {[['High', HIGH_COLOR], ['Medium', MEDIUM_COLOR], ['Low', LOW_COLOR]].map(([l, c]) => (
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

          {/* Charts column */}
          <div className="col-lg-5 d-flex flex-column gap-3">

            {/* Pie — distribution */}
            <div className="card border-0 rounded-4 shadow-sm flex-grow-1">
              <div className="card-header bg-white border-bottom py-2 px-3">
                <span className="fw-semibold small" style={{ color: '#14532d' }}>
                  📈 Growth Distribution
                </span>
              </div>
              <div className="card-body p-0 d-flex align-items-center justify-content-center">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%"
                      innerRadius={50} outerRadius={75}
                      paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} cells`, n]} />
                    <Legend iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar — distance */}
            <div className="card border-0 rounded-4 shadow-sm flex-grow-1">
              <div className="card-header bg-white border-bottom py-2 px-3">
                <span className="fw-semibold small" style={{ color: '#14532d' }}>
                  📏 Growth vs Distance from City
                </span>
              </div>
              <div className="card-body p-2">
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={distanceBands}
                    margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Probability" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

        {/* ── Direction + Road proximity ── */}
        <div className="row g-3 mb-4 anim-fadeinup anim-delay-2">

          {/* Direction */}
          <div className="col-md-6">
            <div className="card border-0 rounded-4 shadow-sm">
              <div className="card-header bg-white border-bottom py-2 px-3">
                <span className="fw-semibold small" style={{ color: '#14532d' }}>
                  🧭 Growth by Direction
                </span>
                <span className="text-muted small ms-2">Relative to AOI centroid</span>
              </div>
              <div className="card-body p-2">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={directions} layout="vertical"
                    margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                    <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={50} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Probability" radius={[0, 4, 4, 0]}>
                      {directions.map((_, i) => (
                        <Cell key={i}
                          fill={i === 0 ? HIGH_COLOR : i === 1 ? MEDIUM_COLOR : LOW_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Road proximity */}
          <div className="col-md-6">
            <div className="card border-0 rounded-4 shadow-sm">
              <div className="card-header bg-white border-bottom py-2 px-3">
                <span className="fw-semibold small" style={{ color: '#14532d' }}>
                  🛣️ Growth vs Road Proximity
                </span>
                <span className="text-muted small ms-2">Does urbanization follow roads?</span>
              </div>
              <div className="card-body p-2">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={roadProximity}
                    margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Probability" radius={[4, 4, 0, 0]}>
                      {roadProximity.map((_, i) => (
                        <Cell key={i}
                          fill={i === 0 ? HIGH_COLOR : i === 1 ? MEDIUM_COLOR : i === 2 ? '#eab308' : LOW_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>

        {/* ── Top 10 zones table ── */}
        <div className="card border-0 rounded-4 shadow-sm mb-4 anim-fadeinup anim-delay-3">
          <div className="card-header bg-white border-bottom py-2 px-3">
            <span className="fw-semibold small" style={{ color: '#14532d' }}>
              🔥 Top 10 High-Growth Zones
            </span>
            <span className="text-muted small ms-2">Ranked by urbanization probability</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0" style={{ fontSize: 13 }}>
              <thead style={{ background: '#f0fdf4' }}>
                <tr>
                  {['Rank', 'Coordinates', 'Probability', 'Category',
                    'Dist. City', 'Dist. Road', 'City Score', 'Road Score'].map(h => (
                    <th key={h} className="px-3 py-2"
                      style={{ color: '#4b7c5a', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topZones.map((cell, i) => (
                  <tr key={cell.cell_id}>
                    <td className="px-3 py-2">
                      <span className={`badge rounded-pill ${i < 3 ? 'bg-danger' : i < 6 ? 'bg-warning' : 'bg-success'}`}>
                        #{i + 1}
                      </span>
                    </td>
                    <td className="font-monospace small" style={{ color: '#4b7c5a' }}>
                      {cell.center[0].toFixed(4)}, {cell.center[1].toFixed(4)}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress rounded-pill" style={{ width: 55, height: 6 }}>
                          <div className="progress-bar bg-danger"
                            style={{ width: `${cell.probability * 100}%` }} />
                        </div>
                        <span className="fw-semibold text-danger">
                          {(cell.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge rounded-pill bg-${cell.category === 'high' ? 'danger' : cell.category === 'medium' ? 'warning' : 'success'}`}>
                        {cell.category}
                      </span>
                    </td>
                    <td>{cell.features.dist_center_km} km</td>
                    <td>{cell.features.dist_road_km ?? 'N/A'} km</td>
                    <td>
                      <div className="progress rounded-pill" style={{ width: 50, height: 5 }}>
                        <div className="progress-bar"
                          style={{ width: `${cell.features.score_center * 100}%`, background: '#16a34a' }} />
                      </div>
                    </td>
                    <td>
                      <div className="progress rounded-pill" style={{ width: 50, height: 5 }}>
                        <div className="progress-bar"
                          style={{ width: `${cell.features.score_road * 100}%`, background: '#15803d' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}