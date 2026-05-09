import math
from app.services.city_registry import find_nearest_city
from app.services.osm_service import fetch_roads, extract_all_segments
from app.services.grid_service import create_grid, compute_polygon_diagonal_km
from app.core.config import get_settings

settings = get_settings()


# ─── Pure math helpers ───────────────────────────────────────────────────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Accurate great-circle distance in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _point_to_segment_km(
    p_lat: float, p_lng: float,
    a_lat: float, a_lng: float,
    b_lat: float, b_lng: float,
) -> float:
    """
    Shortest distance from point P to line SEGMENT AB (not infinite line).
    Works by projecting P onto AB and clamping t to [0, 1].
    All inputs in degrees, output in kilometers.
    """
    # Convert to flat-earth XY in km (valid for small distances < 50km)
    cos_lat = math.cos(math.radians((a_lat + b_lat) / 2))
    km_per_deg_lat = 111.32
    km_per_deg_lng = 111.32 * cos_lat

    ax = (a_lng - p_lng) * km_per_deg_lng
    ay = (a_lat - p_lat) * km_per_deg_lat
    bx = (b_lng - p_lng) * km_per_deg_lng
    by = (b_lat - p_lat) * km_per_deg_lat

    ab_x, ab_y = bx - ax, by - ay
    ab_sq = ab_x ** 2 + ab_y ** 2

    if ab_sq == 0:
        # Segment is a single point
        return math.sqrt(ax ** 2 + ay ** 2)

    # Project P onto AB, clamp to segment
    t = max(0.0, min(1.0, -(ax * ab_x + ay * ab_y) / ab_sq))
    closest_x = ax + t * ab_x
    closest_y = ay + t * ab_y

    return math.sqrt(closest_x ** 2 + closest_y ** 2)


def _min_dist_to_roads_km(
    p_lat: float,
    p_lng: float,
    segments: list[list[list[float]]],
) -> float:
    """Find the minimum distance from a point to any road segment."""
    if not segments:
        return float("inf")

    min_dist = float("inf")
    for seg in segments:
        d = _point_to_segment_km(
            p_lat, p_lng,
            seg[0][0], seg[0][1],
            seg[1][0], seg[1][1],
        )
        if d < min_dist:
            min_dist = d
    return min_dist


# ─── Main engine ─────────────────────────────────────────────────────────────

def run_prediction(
    coordinates: list[list[float]],
    cell_size_meters: int = 500,
    weight_center: float = 0.4,
    weight_roads: float = 0.6,
) -> dict:
    """
    Weighted suitability model for urban growth prediction.

    Drivers:
      1. Distance to nearest known city center  (gravity model)
      2. Distance to nearest OSM road segment   (ribbon development model)

    Scoring:
      - All distances in real kilometers via Haversine
      - Influence radius auto-scaled to polygon diagonal (no hardcoding)
      - Score = 1.0 at distance 0, decays linearly to 0 at max_influence_km
      - Final probability is fully deterministic — no randomness
    """

    # ── 1. Grid ──────────────────────────────────────────────────────────────
    grid_cells = create_grid(coordinates, cell_size_meters)
    if not grid_cells:
        return {"status": "error", "message": "No grid cells generated. AOI may be too small."}

    # ── 2. City center ───────────────────────────────────────────────────────
    city = find_nearest_city(coordinates)
    city_lat = city["lat"]
    city_lng = city["lng"]

    # ── 3. OSM roads ─────────────────────────────────────────────────────────
    roads = fetch_roads(coordinates)
    segments = extract_all_segments(roads)
    roads_available = len(segments) > 0

    # ── 4. Auto-scale influence radius ───────────────────────────────────────
    # Use half the polygon diagonal so influence covers the whole AOI naturally
    diagonal_km = compute_polygon_diagonal_km(coordinates)
    max_influence_km = max(diagonal_km / 2, 1.0)   # floor at 1 km

    # ── 5. Score each cell ───────────────────────────────────────────────────
    predictions = []

    for cell in grid_cells:
        c_lat, c_lng = cell["center"]

        # Distance to city center
        dist_center_km = _haversine_km(c_lat, c_lng, city_lat, city_lng)

        # Distance to nearest road
        dist_road_km = _min_dist_to_roads_km(c_lat, c_lng, segments)

        # Normalize: 1.0 = at the driver, 0.0 = at or beyond max influence
        score_center = max(0.0, 1.0 - (dist_center_km / max_influence_km))

        if roads_available and dist_road_km != float("inf"):
            score_road = max(0.0, 1.0 - (dist_road_km / max_influence_km))
        else:
            # No roads fetched — fall back to center-only scoring
            score_road = score_center
            weight_center = 1.0
            weight_roads = 0.0

        # Weighted combination
        probability = (score_center * weight_center) + (score_road * weight_roads)
        probability = round(max(0.0, min(1.0, probability)), 4)

        category = (
            "high"   if probability >= 0.65 else
            "medium" if probability >= 0.35 else
            "low"
        )

        predictions.append({
            "cell_id":     cell["id"],
            "center":      cell["center"],
            "corners":     cell["corners"],
            "probability": probability,
            "category":    category,
            "features": {
                "dist_center_km": round(dist_center_km, 3),
                "dist_road_km":   round(dist_road_km, 3) if dist_road_km != float("inf") else None,
                "score_center":   round(score_center, 3),
                "score_road":     round(score_road, 3),
                "influence_km":   round(max_influence_km, 3),
            },
        })

    # ── 6. Summary stats ─────────────────────────────────────────────────────
    total = len(predictions)
    high   = sum(1 for p in predictions if p["category"] == "high")
    medium = sum(1 for p in predictions if p["category"] == "medium")
    low    = sum(1 for p in predictions if p["category"] == "low")

    return {
        "status": "success",
        "city": {
            "name":        city["name"],
            "state":       city["state"],
            "distance_km": city["distance_km"],
        },
        "roads": {
            "available":       roads_available,
            "road_count":      len(roads),
            "segment_count":   len(segments),
        },
        "grid": {
            "cell_size_m":     cell_size_meters,
            "total_cells":     total,
            "diagonal_km":     round(diagonal_km, 2),
            "influence_km":    round(max_influence_km, 2),
        },
        "weights": {
            "center": weight_center,
            "roads":  weight_roads,
        },
        "summary": {
            "high":    high,
            "medium":  medium,
            "low":     low,
            "high_pct":   round(high   / total * 100, 1),
            "medium_pct": round(medium / total * 100, 1),
            "low_pct":    round(low    / total * 100, 1),
        },
        "predictions": predictions,
    }