import { useNavigate } from 'react-router-dom'
import MethodologySection from '../components/MethodologySection'

const MATH_TAGS = ['Gravity model', 'OSM roads', 'Haversine', 'Instant result']
const HIST_TAGS = ['Landsat 8/9', 'NDBI / NDVI', 'Temporal trend', 'Planetary Computer']

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="hero-bg min-vh-100 d-flex flex-column">
      <div className="hero-overlay d-flex flex-column min-vh-100">

        {/* ── Navbar ── */}
        <nav className="navbar navbar-dark navbar-glass sticky-top px-4 py-3 anim-fadein">
          <span className="navbar-brand fw-bold fs-5 mb-0">
            🏢 UrbanGrowth
          </span>
          <span className="badge rounded-pill border border-success text-success bg-transparent small">
            Geospatial Intelligence
          </span>
        </nav>

        {/* ── Hero ── */}
        <section className="text-center py-5 px-3">
          <span className="badge rounded-pill border px-3 py-2 mb-3 d-inline-block anim-fadeinup"
            style={{ borderColor: 'rgba(134,239,172,0.4)', color: '#86efac', background: 'rgba(134,239,172,0.1)', fontSize: 11, letterSpacing: '0.05em' }}>
            Urban Growth Prediction Platform
          </span>
          <h1 className="display-5 fw-bold text-white mb-3 anim-fadeinup anim-delay-1"
            style={{ letterSpacing: '-0.03em' }}>
            Predict How Cities Expand
          </h1>
          <p className="mx-auto anim-fadeinup anim-delay-2"
            style={{ maxWidth: 520, lineHeight: 1.75, color: 'rgba(255,255,255,0.62)', fontSize: '1rem' }}>
            Choose a prediction method. Draw an area of interest on the map and get
            instant urbanization analysis powered by real geospatial road data and
            satellite-derived vegetation indices.
          </p>
        </section>

        {/* ── Cards ── */}
        <section className="container pb-5">
          <div className="row g-4 justify-content-center">

            {/* Math card */}
            <div className="col-md-5 anim-fadeinup anim-delay-2">
              <div className="glass-card ug-card card h-100 p-4"
                onClick={() => navigate('/predict/math')}>
                <div className="d-flex align-items-center justify-content-center rounded-3 mb-3"
                  style={{ width: 52, height: 52, background: 'rgba(22,163,74,0.18)', fontSize: 24 }}>
                  📐
                </div>
                <span className="badge rounded-pill mb-2"
                  style={{ background: 'rgba(22,163,74,0.25)', color: '#86efac', border: '1px solid rgba(134,239,172,0.35)', width: 'fit-content' }}>
                  ✓ Available now
                </span>
                <h5 className="fw-bold text-white mb-2">Mathematical Prediction</h5>
                <p className="small flex-grow-1 mb-3"
                  style={{ color: 'rgba(255,255,255,0.58)', lineHeight: 1.7 }}>
                  Draw any area on the map. Fetches real road networks from OpenStreetMap,
                  locates the nearest city center, and scores each grid cell using a
                  weighted gravity suitability model.
                </p>
                <div className="d-flex flex-wrap gap-1 mb-3">
                  {MATH_TAGS.map(t => <span key={t} className="ug-tag">{t}</span>)}
                </div>
                <button className="btn btn-primary w-100 fw-semibold btn-run rounded-3">
                  Open prediction tool →
                </button>
              </div>
            </div>

            {/* Historical card */}
            <div className="col-md-5 anim-fadeinup anim-delay-3">
              <div className="glass-card ug-card card h-100 p-4"
                onClick={() => navigate('/predict/historical')}>
                <div className="d-flex align-items-center justify-content-center rounded-3 mb-3"
                  style={{ width: 52, height: 52, background: 'rgba(22,163,74,0.18)', fontSize: 24 }}>
                  🛰️
                </div>
                <span className="badge rounded-pill mb-2"
                  style={{
                    background: 'rgba(22,163,74,0.25)', color: '#86efac',
                    border: '1px solid rgba(134,239,172,0.35)', width: 'fit-content'
                  }}>
                  ✓ Available now
                </span>
                <h5 className="fw-bold text-white mb-2">
                  Historical Prediction
                </h5>
                <p className="small flex-grow-1 mb-3"
                  style={{ color: 'rgba(255,255,255,0.58)', lineHeight: 1.7 }}>
                  Query Microsoft Planetary Computer's Landsat archive to compute NDBI
                  and NDVI trends across multiple years, revealing how an area has
                  urbanized over time using real satellite imagery.
                </p>
                <div className="d-flex flex-wrap gap-1 mb-3">
                  {HIST_TAGS.map(t => <span key={t} className="ug-tag">{t}</span>)}
                </div>
                <button className="btn btn-primary w-100 fw-semibold btn-run rounded-3">
                  Open historical tool →
                </button>
              </div>
            </div>

          </div>
        </section>

        <MethodologySection />

        {/* ── Footer ── */}
        <footer className="mt-auto text-center py-3 small anim-fadein"
          style={{ color: 'rgba(255,255,255,0.28)', borderTop: '1px solid rgba(134,239,172,0.1)' }}>
          © 2026 UrbanGrowth. Built with geospatial data and a passion for sustainable cities.
        </footer>

      </div>
    </div>
  )
}