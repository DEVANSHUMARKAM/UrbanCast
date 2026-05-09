import math
from shapely.geometry import Polygon, box
from shapely.ops import transform
from pyproj import Transformer


def _get_utm_transformer(lat: float, lng: float):
    """
    Get a transformer to/from the correct UTM zone for a given lat/lng.
    UTM gives us accurate meter-based measurements instead of degree guesses.
    """
    zone = int((lng + 180) / 6) + 1
    hemisphere = "north" if lat >= 0 else "south"
    epsg = 32600 + zone if hemisphere == "north" else 32700 + zone
    to_utm = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True)
    to_wgs = Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)
    return to_utm, to_wgs


def compute_polygon_diagonal_km(coordinates: list[list[float]]) -> float:
    """
    Returns the diagonal of the polygon's bounding box in kilometers.
    Used by the prediction engine to auto-scale the influence radius.
    """
    lats = [c[0] for c in coordinates]
    lngs = [c[1] for c in coordinates]
    lat1, lng1 = min(lats), min(lngs)
    lat2, lng2 = max(lats), max(lngs)

    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return round(2 * 6371 * math.asin(math.sqrt(a)), 3)


def create_grid(
    coordinates: list[list[float]],
    cell_size_meters: int = 500,
) -> list[dict]:
    """
    Creates a uniform grid over a polygon AOI.

    Fixes over the old version:
    - Uses UTM projection for accurate meter-based cell sizing
    - Clips cells to polygon boundary before computing centroid
    - Returns corners in consistent [lat, lng] order
    - Skips slivers (cells with < 10% coverage of a full cell)
    """
    lat_center = sum(c[0] for c in coordinates) / len(coordinates)
    lng_center = sum(c[1] for c in coordinates) / len(coordinates)

    to_utm, to_wgs = _get_utm_transformer(lat_center, lng_center)

    # Build polygon in WGS84, project to UTM for accurate grid math
    polygon_wgs = Polygon([(c[1], c[0]) for c in coordinates])
    polygon_utm = transform(to_utm.transform, polygon_wgs)

    minx, miny, maxx, maxy = polygon_utm.bounds
    full_cell_area = cell_size_meters ** 2
    min_cell_area = full_cell_area * 0.10  # skip slivers < 10% of a full cell

    grid = []
    cell_id = 0
    y = miny

    while y < maxy:
        x = minx
        while x < maxx:
            cell_utm = box(
                x, y,
                min(x + cell_size_meters, maxx),
                min(y + cell_size_meters, maxy),
            )

            if not cell_utm.intersects(polygon_utm):
                x += cell_size_meters
                continue

            clipped = cell_utm.intersection(polygon_utm)

            if clipped.area < min_cell_area:
                x += cell_size_meters
                continue

            # Centroid in UTM → back to WGS84
            cx, cy = clipped.centroid.x, clipped.centroid.y
            c_lng, c_lat = to_wgs.transform(cx, cy)

            # Corners of the full cell in UTM → WGS84
            corners_utm = [
                (x,                         y),
                (x,                         y + cell_size_meters),
                (x + cell_size_meters,      y + cell_size_meters),
                (x + cell_size_meters,      y),
                (x,                         y),  # close ring
            ]
            corners_wgs = []
            for cx_c, cy_c in corners_utm:
                lng_c, lat_c = to_wgs.transform(cx_c, cy_c)
                corners_wgs.append([lat_c, lng_c])

            grid.append({
                "id": cell_id,
                "center": [round(c_lat, 6), round(c_lng, 6)],
                "corners": corners_wgs,
            })
            cell_id += 1
            x += cell_size_meters
        y += cell_size_meters

    return grid