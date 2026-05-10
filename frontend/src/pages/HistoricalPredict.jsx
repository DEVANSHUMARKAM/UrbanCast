import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/Map/MapView'
import HistoricalDashboard from '../components/Results/HistoricalDashboard'
import { runHistoricalPrediction } from '../services/api'

const CURRENT_YEAR = new Date().getFullYear()

export default function HistoricalPredict() {
  const navigate = useNavigate()

  const [view, setView]         = useState('workspace')
  const [coords, setCoords]     = useState(null)
  const [startYear, setStartYear] = useState(2015)
  const [endYear, setEndYear]   = useState(2023)
  const [cellSize, setCellSize] = useState(500)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const yearsCount     = endYear - startYear + 1
  const estimatedMins  = Math.ceil(yearsCount * 20 / 60)

  const handlePolygonDrawn = (c) => { setCoords(c); setResult(null); setError(null) }
  const handleReset        = ()  => { setCoords(null); setResult(null); setError(null) }

  const handleRun = async () => {
    if (!coords) return
    setLoading(true); setError(null); setResult(null)
    try {
      const { data } = await runHistoricalPrediction({
        coordinates:      coords,
        start_year:       startYear,
        end_year:         endYear,
        cell_size_meters: cellSize,
      })
      setResult(data)
      setView('dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Try again.')
    } finally { setLoading(false) }
  }

  // ── Dashboard view ────────────────────────────────────────────────────────
  if (view === 'dashboard' && result) {
    return (
      <HistoricalDashboard
        result={result}
        coords={coords}
        onBack={() => setView('workspace')}
      />
    )
  }

  // ── Workspace view ────────────────────────────────────────────────────────
  return (
    <div className="d-flex flex-column" style={{ height: '100vh' }}>

      {/* ── Navbar ── */}
      <nav className="navbar navbar-dark px-3 py-2"
        style={{ background: 'linear-gradient(90deg,#14532d,#15803d)', minHeight: 52 }}>
        <button className="btn btn-sm me-3 fw-medium"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onClick={() => navigate('/')}>
          ← Back
        </button>
        <span className="navbar-brand mb-0 fw-bold">UrbanGrowth</span>
        <span className="ms-1 small" style={{ color: '#86efac' }}>
          / Historical Prediction
        </span>
        {result && (
          <button className="ms-auto btn btn-sm"
            style={{ background: '#16a34a', color: '#fff', border: 'none' }}
            onClick={() => setView('dashboard')}>
            View Dashboard →
          </button>
        )}
      </nav>

      <div className="d-flex flex-grow-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <div className="ug-sidebar d-flex flex-column overflow-auto p-3 anim-slideinleft"
          style={{ width: 300, minWidth: 300 }}>

          {/* Info box */}
          <div className="alert alert-primary py-2 px-3 small mb-3 rounded-3">
            <strong>How to use:</strong> Draw a polygon, select a year range,
            then click <em>Run Analysis</em>. The engine queries Landsat satellite
            imagery from Microsoft Planetary Computer for each year.
          </div>

          {/* Data source badge */}
          <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded-3"
            style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
            <span style={{ fontSize: 20 }}>🛰️</span>
            <div style={{ fontSize: 12, color: '#14532d' }}>
              <strong>Landsat Collection 2</strong>
              <div style={{ color: '#4b7c5a' }}>Microsoft Planetary Computer</div>
            </div>
          </div>

          {/* AOI */}
          <div className="mb-3">
            <label className="ug-label form-label">Area of Interest</label>
            <div className="d-flex gap-2">
              {coords
                ? <span className="badge bg-primary flex-grow-1 py-2 rounded-3">
                    ✓ {coords.length - 1} points drawn
                  </span>
                : <span className="badge bg-light text-secondary border flex-grow-1 py-2 rounded-3">
                    No polygon yet
                  </span>
              }
              {coords && (
                <button className="btn btn-sm btn-outline-danger px-2 rounded-3"
                  onClick={handleReset}>✕</button>
              )}
            </div>
          </div>

          {/* Start year */}
          <div className="mb-3">
            <label className="ug-label form-label">
              Start Year — {startYear}
            </label>
            <input type="range" className="form-range"
              min={2013} max={2023} step={1}
              value={startYear}
              onChange={e => {
                const v = Number(e.target.value)
                setStartYear(v)
                if (endYear < v) setEndYear(v)
              }} />
            <div className="d-flex justify-content-between"
              style={{ fontSize: 11, color: '#86a08a' }}>
              <span>2013 (Landsat 8 launch)</span><span>2023</span>
            </div>
          </div>

          {/* End year */}
          <div className="mb-3">
            <label className="ug-label form-label">
              End Year — {endYear}
            </label>
            <input type="range" className="form-range"
              min={startYear} max={2024} step={1}
              value={endYear}
              onChange={e => setEndYear(Number(e.target.value))} />
            <div className="d-flex justify-content-between"
              style={{ fontSize: 11, color: '#86a08a' }}>
              <span>{startYear}</span><span>2024</span>
            </div>
          </div>

          {/* Year summary pill */}
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="badge bg-primary rounded-pill px-3 py-2">
              {yearsCount} year{yearsCount !== 1 ? 's' : ''} selected
            </span>
            <span className="small text-muted">
              ~{estimatedMins}–{estimatedMins + 1} min to process
            </span>
          </div>

          {/* Cell size */}
          <div className="mb-3">
            <label className="ug-label form-label">Cell Size — {cellSize}m</label>
            <input type="range" className="form-range"
              min={100} max={2000} step={100}
              value={cellSize}
              onChange={e => setCellSize(Number(e.target.value))} />
            <div className="d-flex justify-content-between"
              style={{ fontSize: 11, color: '#86a08a' }}>
              <span>100m fine</span><span>2000m coarse</span>
            </div>
          </div>

          {/* Run button */}
          <button
            className={`btn btn-primary w-100 fw-semibold mb-3 rounded-3 text-white ${coords && !loading ? 'btn-run' : ''}`}
            onClick={handleRun}
            disabled={!coords || loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />
                  Querying Landsat archive...
                </>
              : '▶  Run Historical Analysis'}
          </button>

          {/* Processing note */}
          {!loading && coords && (
            <div className="small text-muted text-center mb-2">
              ⏱ Expected: {estimatedMins}–{estimatedMins + 1} minutes
              for {yearsCount} year{yearsCount !== 1 ? 's' : ''}
            </div>
          )}

          {error && (
            <div className="alert alert-danger py-2 small rounded-3">{error}</div>
          )}

          {result && (
            <button
              className="btn btn-outline-success w-100 rounded-3 fw-semibold anim-fadeinup"
              onClick={() => setView('dashboard')}>
              📊 Open Analysis Dashboard →
            </button>
          )}
        </div>

        {/* ── Map ── */}
        <div className="flex-grow-1 position-relative">
          <MapView
            onPolygonDrawn={handlePolygonDrawn}
            predictions={result?.predictions ?? []}
            drawnCoords={coords}
          />

          {!coords && !loading && (
            <div className="position-absolute top-50 start-50 translate-middle text-center anim-fadein"
              style={{ pointerEvents: 'none', zIndex: 1000 }}>
              <div className="bg-white rounded-4 shadow-lg px-4 py-3"
                style={{ border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 34 }}>🛰️</div>
                <div className="fw-semibold" style={{ color: '#14532d' }}>
                  Draw a polygon
                </div>
                <div className="text-muted small">
                  Use the toolbar on the left of the map
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div
              className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ background: 'rgba(240,253,244,0.92)', zIndex: 1000 }}>
              <div className="text-center anim-fadein">
                <div className="spinner-border mb-3"
                  style={{ width: 56, height: 56, color: '#16a34a' }} />
                <div className="fw-semibold mb-1"
                  style={{ color: '#14532d', fontSize: 17 }}>
                  Querying Landsat archive...
                </div>
                <div className="text-muted small mb-3">
                  Loading {yearsCount} year{yearsCount !== 1 ? 's' : ''} of satellite imagery
                </div>
                <div className="bg-white rounded-3 px-4 py-2 shadow-sm small"
                  style={{ color: '#4b7c5a', border: '1px solid #bbf7d0' }}>
                  🛰️ Microsoft Planetary Computer · Landsat C2L2<br />
                  ⏱ Expected: {estimatedMins}–{estimatedMins + 1} minutes
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}