import overpy
import requests
from shapely.geometry import Polygon, LineString
from app.core.config import get_settings

settings = get_settings()

ROAD_TYPES = {
    "motorway", "trunk", "primary",
    "secondary", "tertiary", "motorway_link",
    "trunk_link", "primary_link",
}

# Fallback endpoints if the primary is overloaded
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def _run_overpass_query(query: str) -> overpy.Result | None:
    """Try each endpoint until one succeeds."""
    for url in OVERPASS_ENDPOINTS:
        try:
            response = requests.post(
                url,
                data={"data": query},
                headers={"User-Agent": "UrbanCast/1.0 (urban growth prediction tool)"},
                timeout=45,
            )
            if response.status_code == 200:
                api = overpy.Overpass()
                return api.parse_json(response.text)   # ← text not .json()
        except Exception as e:
            print(f"[OSM] Endpoint {url} failed: {e}")
            continue
    return None


def _build_bbox(coordinates: list[list[float]]) -> tuple[float, float, float, float]:
    lats = [c[0] for c in coordinates]
    lngs = [c[1] for c in coordinates]
    return min(lats), min(lngs), max(lats), max(lngs)


def fetch_roads(coordinates: list[list[float]]) -> list[dict]:
    min_lat, min_lng, max_lat, max_lng = _build_bbox(coordinates)
    polygon = Polygon([(c[1], c[0]) for c in coordinates])

    query = f"""
    [out:json][timeout:{settings.OSM_TIMEOUT}];
    (
      way["highway"]({min_lat},{min_lng},{max_lat},{max_lng});
    );
    out body;
    >;
    out skel qt;
    """

    result = _run_overpass_query(query)
    if result is None:
        print("[OSM] All endpoints failed — returning empty road list")
        return []

    node_map: dict[int, tuple[float, float]] = {
        node.id: (float(node.lat), float(node.lon))
        for node in result.nodes
    }

    roads = []

    for way in result.ways:
        highway_type = way.tags.get("highway", "")
        if highway_type not in ROAD_TYPES:
            continue

        node_coords = [
            node_map[node_id]
            for node_id in way._node_ids
            if node_id in node_map
        ]

        if len(node_coords) < 2:
            continue

        line = LineString([(c[1], c[0]) for c in node_coords])
        clipped = line.intersection(polygon)

        if clipped.is_empty:
            continue

        geoms = (
            [clipped]
            if clipped.geom_type == "LineString"
            else list(clipped.geoms)
        )

        segments = []
        for geom in geoms:
            coords = list(geom.coords)
            for i in range(len(coords) - 1):
                lng1, lat1 = coords[i]
                lng2, lat2 = coords[i + 1]
                segments.append([
                    [round(lat1, 6), round(lng1, 6)],
                    [round(lat2, 6), round(lng2, 6)],
                ])

        if segments:
            roads.append({
                "name": way.tags.get("name", "unnamed"),
                "type": highway_type,
                "segments": segments,
            })

    return roads


def extract_all_segments(roads: list[dict]) -> list[list[list[float]]]:
    segments = []
    for road in roads:
        segments.extend(road["segments"])
    return segments