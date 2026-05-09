import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/Map/MapView'
import Dashboard from '../components/Results/Dashboard'
import { runMathPrediction } from '../services/api'

export default function MathPredict() {
  const navigate = useNavigate()

  const [view, setView]                 = useState('workspace')  // 'workspace' | 'dashboard'
  const [coords, setCoords]             = useState(null)
  const [cellSize, setCellSize]         = useState(500)
  const [weightCenter, setWeightCenter] = useState(0.4)
  const [result, setResult]             = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  const weightRoads = parseFloat((1 - weightCenter).toFixed(2))

  const handlePolygonDrawn = (c) => { setCoords(c); setResult(null); setError(null) }
  const handleReset        = ()  => { setCoords(null); setResult(null); setError(null) }

  const handlePredict = async () => {
    if (!coords) return
    setLoading(true); setError(null); setResult(null)
    try {
      const { data } = await runMathPrediction({
        coordinates: coords, cell_size_meters: cellSize,
        weight_center: weightCenter, weight_roads: weightRoads,
      })
      setResult(data)
      setView('dashboard')   // ← auto-switch to dashboard
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed. Try again.')
    } finally { setLoading(false) }
  }

  // ── Dashboard view ──────────────────────────────────────────────────────────
  if (view === 'dashboard' && result) {
    return (
      <Dashboard
        result={result}
        coords={coords}
        onBack={() => setView('workspace')}
      />
    )
  }

  // ── Workspace view ──────────────────────────────────────────────────────────
  return (
    <div className="d-flex flex-column" style={{ height: '100vh' }}>

      <nav className="navbar navbar-dark px-3 py-2"
        style={{ background: 'linear-gradient(90deg,#14532d,#15803d)', minHeight: 52 }}>
        <button className="btn btn-sm me-3 fw-medium"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onClick={() => navigate('/')}>
          ← Back
        </button>
        <span className="navbar-brand mb-0 fw-bold">🌿 UrbanGrowth</span>
        <span className="ms-1 small" style={{ color: '#86efac' }}>/ Mathematical Prediction</span>
        {result && (
          <button className="ms-auto btn btn-sm"
            style={{ background: '#16a34a', color: '#fff', border: 'none' }}
            onClick={() => setView('dashboard')}>
            View Dashboard →
          </button>
        )}
      </nav>

      <div className="d-flex flex-grow-1 overflow-hidden">

        <div className="ug-sidebar d-flex flex-column overflow-auto p-3 anim-slideinleft"
          style={{ width: 300, minWidth: 300 }}>

          <div className="alert alert-primary py-2 px-3 small mb-3 rounded-3">
            <strong>How to use:</strong> Click the polygon tool on the map,
            draw your area, then click <em>Run Prediction</em>.
          </div>

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

          <div className="mb-3">
            <label className="ug-label form-label">Cell Size — {cellSize}m</label>
            <input type="range" className="form-range"
              min={100} max={2000} step={100} value={cellSize}
              onChange={e => setCellSize(Number(e.target.value))} />
            <div className="d-flex justify-content-between" style={{ fontSize: 11, color: '#86a08a' }}>
              <span>100m fine</span><span>2000m coarse</span>
            </div>
          </div>

          <div className="mb-3">
            <label className="ug-label form-label">
              City Center Weight — {Math.round(weightCenter * 100)}%
            </label>
            <div className="d-flex align-items-center gap-2">
              <input type="range" className="form-range flex-grow-1"
                min={0} max={1} step={0.05} value={weightCenter}
                onChange={e => setWeightCenter(parseFloat(e.target.value))} />
              <span className="badge bg-primary rounded-pill">{Math.round(weightCenter * 100)}%</span>
            </div>
            <label className="ug-label form-label mt-2">
              Road Network Weight — {Math.round(weightRoads * 100)}%
            </label>
            <div className="d-flex align-items-center gap-2">
              <div className="progress flex-grow-1" style={{ height: 8 }}>
                <div className="progress-bar bg-success"
                  style={{ width: `${weightRoads * 100}%`, transition: 'width 0.2s' }} />
              </div>
              <span className="badge bg-success rounded-pill">{Math.round(weightRoads * 100)}%</span>
            </div>
            <div className="text-muted mt-1" style={{ fontSize: 11 }}>
              Road weight auto-adjusts to sum to 100%
            </div>
          </div>

          <button
            className={`btn btn-primary w-100 fw-semibold mb-3 rounded-3 text-white ${coords && !loading ? 'btn-run' : ''}`}
            onClick={handlePredict} disabled={!coords || loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />Analysing...</>
              : '▶  Run Prediction'}
          </button>

          {error && <div className="alert alert-danger py-2 small rounded-3">{error}</div>}

          {result && (
            <button className="btn btn-outline-success w-100 rounded-3 fw-semibold anim-fadeinup"
              onClick={() => setView('dashboard')}>
              📊 Open Full Dashboard →
            </button>
          )}
        </div>

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
                <div style={{ fontSize: 34 }}>✏️</div>
                <div className="fw-semibold" style={{ color: '#14532d' }}>Draw a polygon</div>
                <div className="text-muted small">Use the toolbar on the left of the map</div>
              </div>
            </div>
          )}
          {loading && (
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ background: 'rgba(240,253,244,0.88)', zIndex: 1000 }}>
              <div className="text-center anim-fadein">
                <div className="spinner-border mb-3"
                  style={{ width: 52, height: 52, color: '#16a34a' }} />
                <div className="fw-semibold" style={{ color: '#14532d', fontSize: 16 }}>
                  Fetching OSM roads...
                </div>
                <div className="text-muted small mt-1">This may take 15–20 seconds</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}