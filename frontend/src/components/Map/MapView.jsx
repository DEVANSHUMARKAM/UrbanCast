import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap, Polygon, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'

const CATEGORY_COLORS = {
  high:   { color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.5  },
  medium: { color: '#d97706', fillColor: '#fbbf24', fillOpacity: 0.45 },
  low:    { color: '#16a34a', fillColor: '#4ade80', fillOpacity: 0.4  },
}

function FitBounds({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (!coords?.length) return
    map.fitBounds(L.latLngBounds(coords.map(c => [c[0], c[1]])), { padding: [40, 40] })
  }, [coords, map])
  return null
}

function DrawControl({ onPolygonDrawn }) {
  const map = useMap()
  const drawnItems = useRef(new L.FeatureGroup())
  useEffect(() => {
    map.addLayer(drawnItems.current)
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon:      { shapeOptions: { color: '#16a34a' } },
        rectangle:    false, circle: false,
        circlemarker: false, marker: false, polyline: false,
      },
      edit: { featureGroup: drawnItems.current },
    })
    map.addControl(drawControl)
    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.current.clearLayers()
      drawnItems.current.addLayer(e.layer)
      const coords = e.layer.getLatLngs()[0].map(ll => [ll.lat, ll.lng])
      coords.push(coords[0])
      onPolygonDrawn(coords)
    })
    map.on(L.Draw.Event.DELETED, () => onPolygonDrawn(null))
    return () => { map.removeControl(drawControl); map.removeLayer(drawnItems.current) }
  }, [map])
  return null
}

function GridOverlay({ predictions }) {
  if (!predictions?.length) return null
  return predictions.map(cell => (
    <Polygon key={cell.cell_id} positions={cell.corners}
      pathOptions={CATEGORY_COLORS[cell.category]}>
      <Tooltip sticky>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          <strong>{(cell.probability * 100).toFixed(1)}%</strong> — {cell.category}<br />
          City distance: {cell.features.dist_center_km} km<br />
          Road distance: {cell.features.dist_road_km ?? 'N/A'} km
        </div>
      </Tooltip>
    </Polygon>
  ))
}

function Legend({ visible }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'absolute', bottom: 28, right: 12, zIndex: 1000,
      background: 'white', borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.15)', fontSize: 12,
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: '#14532d' }}>Growth probability</div>
      {[
        { label: 'High  ≥ 65%',   color: '#ef4444' },
        { label: 'Medium 35–64%', color: '#fbbf24' },
        { label: 'Low   < 35%',   color: '#4ade80' },
      ].map(({ label, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: color }} />
          <span style={{ color: '#64748b' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function MapView({ onPolygonDrawn, predictions, drawnCoords, readOnly = false }) {
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer center={[21.1458, 79.0882]} zoom={11}
        style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {!readOnly && <DrawControl onPolygonDrawn={onPolygonDrawn} />}
        <FitBounds coords={drawnCoords} />
        <GridOverlay predictions={predictions} />
      </MapContainer>
      <Legend visible={predictions?.length > 0} />
    </div>
  )
}