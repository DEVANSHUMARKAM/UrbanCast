const MATH_STEPS = [
  { icon: '✏️', title: 'Draw AOI',         desc: 'User draws a polygon over any area of interest on the satellite map.' },
  { icon: '⬛', title: 'Generate Grid',     desc: 'AOI is divided into uniform cells using UTM projection for accurate metre-based sizing.' },
  { icon: '🛣️', title: 'Fetch OSM Roads',  desc: 'Real road segments are pulled from OpenStreetMap via Overpass API and clipped to the AOI.' },
  { icon: '🏙️', title: 'City Center',      desc: 'Nearest known city center is detected from a registry of 50 Indian cities using geodesic distance.' },
  { icon: '📏', title: 'Haversine Dist.',  desc: 'Great-circle distances from each cell to the city center and nearest road segment are computed in km.' },
  { icon: '⚖️', title: 'Weighted Score',   desc: 'Each cell gets a suitability score: 40% city gravity + 60% road proximity, auto-scaled to AOI size.' },
]

const HIST_STEPS = [
  { icon: '✏️', title: 'Draw AOI',           desc: 'User draws a polygon and selects a year range (2013–2024, Landsat 8/9 era).' },
  { icon: '🛰️', title: 'Query STAC API',     desc: 'Microsoft Planetary Computer STAC is queried for the least-cloudy Landsat scene per year.' },
  { icon: '📡', title: 'Load Landsat Bands', desc: 'Red (B4), NIR (B5), SWIR (B6) bands are loaded as Cloud-Optimized GeoTIFFs, windowed to the AOI.' },
  { icon: '🔢', title: 'Scale + Compute',    desc: 'LC2 scale factors applied (×0.0000275 − 0.2), then NDBI and NDVI computed per pixel.' },
  { icon: '📈', title: 'Year-by-Year Stats', desc: 'NDBI mean, NDVI mean, and urban percentage are extracted for each year to form a time series.' },
  { icon: '🔍', title: 'Trend Detection',    desc: 'Change in urban % across years determines if the area is urbanizing, stable, or recovering.' },
]

const INDICES = [
  {
    name: 'NDBI',
    full: 'Normalized Difference Built-up Index',
    formula: 'NDBI = (SWIR − NIR) / (SWIR + NIR)',
    desc: 'Positive values indicate built-up surfaces. Rising NDBI over years signals urbanization.',
    color: '#dc2626',
  },
  {
    name: 'NDVI',
    full: 'Normalized Difference Vegetation Index',
    formula: 'NDVI = (NIR − Red) / (NIR + Red)',
    desc: 'Positive values indicate healthy vegetation. Declining NDVI confirms vegetation loss to urban expansion.',
    color: '#16a34a',
  },
  {
    name: 'Haversine',
    full: 'Great-Circle Distance Formula',
    formula: 'd = 2R · arcsin(√(sin²(Δlat/2) + cos(lat₁)·cos(lat₂)·sin²(Δlng/2)))',
    desc: 'Accurate kilometre distances between grid cell centers and city/road locations on a spherical Earth.',
    color: '#2563eb',
  },
  {
    name: 'Gravity Model',
    full: 'Weighted Suitability Score',
    formula: 'Score = (w₁ × S_center) + (w₂ × S_road)',
    desc: 'Urban growth probability combining city-center gravity and road-ribbon development, weighted by user preference.',
    color: '#d97706',
  },
]

const SOURCES = [
  { icon: '🗺️', name: 'OpenStreetMap',              sub: 'Real road network via Overpass API',           color: '#dcfce7', border: '#86efac' },
  { icon: '🌍', name: 'Microsoft Planetary Computer', sub: 'Landsat Collection 2 Level-2 archive',        color: '#dbeafe', border: '#93c5fd' },
  { icon: '🛰️', name: 'Landsat 8 / 9',              sub: 'Red, NIR, SWIR bands · 30m resolution',        color: '#fef9c3', border: '#fde047' },
  { icon: '📐', name: 'UTM Projection',              sub: 'Accurate metre-based grid generation via pyproj', color: '#dcfce7', border: '#86efac' },
  { icon: '🐍', name: 'FastAPI + Python',            sub: 'Shapely · rioxarray · GeoPandas · NumPy',      color: '#f3e8ff', border: '#c4b5fd' },
  { icon: '⚛️', name: 'React + Bootstrap',           sub: 'Leaflet.js · Recharts · Vite',                 color: '#dcfce7', border: '#86efac' },
]

export default function MethodologySection() {
  return (
    <section style={{
      position: 'relative',
      zIndex: 10,
      width: '100%',
      background: 'rgba(5,46,22,0.72)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(134,239,172,0.15)',
      borderBottom: '1px solid rgba(134,239,172,0.15)',
      padding: '4rem 0',
    }}>
      <div className="container">

        {/* ── Header ── */}
        <div className="text-center mb-5 anim-fadeinup">
          <span className="badge rounded-pill px-3 py-2 mb-3 d-inline-block"
            style={{
              background: 'rgba(134,239,172,0.12)',
              color: '#86efac',
              border: '1px solid rgba(134,239,172,0.3)',
              fontSize: 11, letterSpacing: '0.05em',
            }}>
            Under the hood
          </span>
          <h2 className="fw-bold text-white mb-3" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>
            How UrbanGrowth Works
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>
            Two independent pipelines — one driven by geospatial mathematics,
            the other by real satellite imagery — both producing actionable
            urbanization predictions.
          </p>
        </div>

        {/* ── Method steps ── */}
        <div className="row g-4 mb-5 anim-fadeinup anim-delay-1">

          {/* Math */}
          <div className="col-md-6">
            <div className="rounded-4 p-4 h-100"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(134,239,172,0.2)',
                backdropFilter: 'blur(8px)',
              }}>
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: 44, height: 44, background: 'rgba(22,163,74,0.2)', fontSize: 22 }}>
                  📐
                </div>
                <div>
                  <div className="fw-bold text-white">Mathematical Method</div>
                  <div style={{ fontSize: 12, color: '#86efac' }}>
                    Gravity model · OSM roads · Haversine
                  </div>
                </div>
              </div>
              <div className="d-flex flex-column gap-3">
                {MATH_STEPS.map((step, i) => (
                  <div key={i} className="d-flex gap-3 align-items-start">
                    <div className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle fw-bold"
                      style={{
                        width: 28, height: 28,
                        background: 'rgba(22,163,74,0.2)',
                        border: '1px solid rgba(134,239,172,0.3)',
                        color: '#86efac', fontSize: 12,
                      }}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="fw-semibold" style={{ color: '#fff', fontSize: 13 }}>
                        {step.icon} {step.title}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6 }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Historical */}
          <div className="col-md-6">
            <div className="rounded-4 p-4 h-100"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(134,239,172,0.2)',
                backdropFilter: 'blur(8px)',
              }}>
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: 44, height: 44, background: 'rgba(22,163,74,0.2)', fontSize: 22 }}>
                  🛰️
                </div>
                <div>
                  <div className="fw-bold text-white">Historical Method</div>
                  <div style={{ fontSize: 12, color: '#86efac' }}>
                    Landsat C2L2 · NDBI/NDVI · Planetary Computer
                  </div>
                </div>
              </div>
              <div className="d-flex flex-column gap-3">
                {HIST_STEPS.map((step, i) => (
                  <div key={i} className="d-flex gap-3 align-items-start">
                    <div className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle fw-bold"
                      style={{
                        width: 28, height: 28,
                        background: 'rgba(22,163,74,0.2)',
                        border: '1px solid rgba(134,239,172,0.3)',
                        color: '#86efac', fontSize: 12,
                      }}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="fw-semibold" style={{ color: '#fff', fontSize: 13 }}>
                        {step.icon} {step.title}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6 }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Key indices ── */}
        <div className="mb-5 anim-fadeinup anim-delay-2">
          <h5 className="text-white fw-semibold mb-4 text-center">
            Key Indices & Formulas
          </h5>
          <div className="row g-3">
            {INDICES.map(({ name, full, formula, desc, color }) => (
              <div className="col-md-6 col-lg-3" key={name}>
                <div className="rounded-4 p-3 h-100"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${color}33`,
                    backdropFilter: 'blur(8px)',
                  }}>
                  <div className="fw-bold mb-1" style={{ color, fontSize: 18 }}>{name}</div>
                  <div className="small mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                    {full}
                  </div>
                  <div className="rounded-3 px-2 py-2 mb-2 font-monospace"
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      color: '#86efac',
                      fontSize: 11,
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                    {formula}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.6 }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Data sources ── */}
        <div className="anim-fadeinup anim-delay-3">
          <h5 className="text-white fw-semibold mb-4 text-center">
            Data Sources & Tech Stack
          </h5>
          <div className="row g-3 justify-content-center">
            {SOURCES.map(({ icon, name, sub, color, border }) => (
              <div className="col-6 col-md-4 col-lg-2" key={name}>
                <div className="rounded-4 p-3 text-center h-100"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(134,239,172,0.15)',
                    backdropFilter: 'blur(8px)',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(134,239,172,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(134,239,172,0.15)'}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
                  <div className="fw-semibold" style={{ color: '#fff', fontSize: 12 }}>{name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>
                    {sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}