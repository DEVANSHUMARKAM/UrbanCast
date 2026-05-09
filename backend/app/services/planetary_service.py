"""
Microsoft Planetary Computer — Landsat Historical NDBI/NDVI Analysis

Pipeline per year:
  1. Query PC STAC for least-cloudy Landsat C2L2 scene
  2. Load Red, NIR, SWIR bands windowed to AOI bbox
  3. Apply scale factors → compute NDBI + NDVI
  4. Return scene-level stats

For latest year also:
  5. Reproject raster to WGS84
  6. Sample NDBI at each grid cell center
  7. Return per-cell categories for map overlay
"""

import numpy as np
import xarray as xr
import rioxarray          # noqa: F401 — registers .rio accessor
import planetary_computer
import pystac_client

# Landsat Collection 2 Level-2 surface reflectance scale factors
SCALE       = 0.0000275
OFFSET      = -0.2
CATALOG_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
COLLECTION  = "landsat-c2-l2"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _build_bbox(coordinates: list[list[float]]) -> tuple:
    """Returns (min_lng, min_lat, max_lng, max_lat) for STAC queries."""
    lats = [c[0] for c in coordinates]
    lngs = [c[1] for c in coordinates]
    return (min(lngs), min(lats), max(lngs), max(lats))


def _scale(arr: np.ndarray) -> np.ndarray:
    """Apply LC2 scale + offset and mask physically impossible values."""
    out = arr.astype(float) * SCALE + OFFSET
    return np.where((out > -0.25) & (out < 1.25), out, np.nan)


def _indices(red, nir, swir):
    """Compute NDBI and NDVI from scaled band arrays."""
    ndbi = np.where(swir + nir != 0, (swir - nir) / (swir + nir), np.nan)
    ndvi = np.where(nir  + red != 0, (nir  - red) / (nir  + red), np.nan)
    return ndbi, ndvi


# ── STAC query ────────────────────────────────────────────────────────────────

def _find_best_item(catalog, bbox: tuple, year: int):
    """
    Find the least-cloudy Landsat scene for a given year.
    Prefers June–September (dry season for India) then falls back to full year.
    """
    windows = [
        (f"{year}-06-01/{year}-09-30", 30),
        (f"{year}-01-01/{year}-12-31", 50),
    ]
    for dt_range, max_cloud in windows:
        try:
            search = catalog.search(
                collections=[COLLECTION],
                bbox=bbox,
                datetime=dt_range,
                query={"eo:cloud_cover": {"lt": max_cloud}},
                max_items=10,
            )
            items = list(search.items())
            if items:
                return min(items,
                           key=lambda i: i.properties.get("eo:cloud_cover", 100))
        except Exception as e:
            print(f"[PC] STAC search error ({year}): {e}")
    return None


# ── Band loading ──────────────────────────────────────────────────────────────

def _load_bands(item, bbox: tuple) -> dict | None:
    """
    Sign the item, then load Red / NIR / SWIR clipped to bbox.
    Returns dict of rioxarray DataArrays in native UTM projection.
    """
    try:
        signed = planetary_computer.sign(item)
        bands  = {}
        for name in ["red", "nir08", "swir16"]:
            asset = signed.assets.get(name)
            if asset is None:
                print(f"[PC] Asset '{name}' missing in item")
                return None

            da = rioxarray.open_rasterio(asset.href, masked=True, lock=False)
            clipped = da.rio.clip_box(
                minx=bbox[0], miny=bbox[1],
                maxx=bbox[2], maxy=bbox[3],
                crs="EPSG:4326",
            )
            bands[name] = clipped
        return bands
    except Exception as e:
        print(f"[PC] Band load failed: {e}")
        return None


# ── Scene-level stats ─────────────────────────────────────────────────────────

def _scene_stats(bands: dict) -> dict | None:
    """Compute NDBI / NDVI statistics from a band dict."""
    try:
        red  = _scale(bands["red"].values[0])
        nir  = _scale(bands["nir08"].values[0])
        swir = _scale(bands["swir16"].values[0])
        ndbi, ndvi = _indices(red, nir, swir)

        valid_ndbi = ndbi[~np.isnan(ndbi)]
        valid_ndvi = ndvi[~np.isnan(ndvi)]

        if len(valid_ndbi) == 0:
            return None

        return {
            "ndbi_mean": round(float(np.nanmean(valid_ndbi)), 4),
            "ndvi_mean": round(float(np.nanmean(valid_ndvi)), 4),
            "urban_pct": round(float(np.mean(valid_ndbi > 0) * 100), 2),
        }
    except Exception as e:
        print(f"[PC] Stats computation failed: {e}")
        return None


# ── Per-cell NDBI sampling ────────────────────────────────────────────────────

def _build_ndbi_grid(bands: dict, grid_cells: list) -> list:
    """
    Reproject the latest-year bands to WGS84, compute NDBI,
    then sample at each grid cell center using nearest-neighbour.
    """
    try:
        # Reproject all three bands to WGS84
        red_wgs  = bands["red"].rio.reproject("EPSG:4326")
        nir_wgs  = bands["nir08"].rio.reproject("EPSG:4326")
        swir_wgs = bands["swir16"].rio.reproject("EPSG:4326")

        red  = _scale(red_wgs.values[0])
        nir  = _scale(nir_wgs.values[0])
        swir = _scale(swir_wgs.values[0])
        ndbi, _ = _indices(red, nir, swir)

        # Build a named DataArray so xarray can do nearest-neighbour lookup
        ndbi_da = xr.DataArray(
            ndbi,
            coords={"y": red_wgs.y.values, "x": red_wgs.x.values},
            dims=["y", "x"],
        )

        enriched = []
        for cell in grid_cells:
            lat, lng = cell["center"]
            try:
                val = float(ndbi_da.sel(y=lat, x=lng, method="nearest").values)
                if np.isnan(val):
                    val = 0.0
            except Exception:
                val = 0.0

            # NDBI thresholds (peer-reviewed standards)
            # > 0.1  → dense urban / built-up
            #  0–0.1 → sparse urban / mixed
            # < 0    → vegetation / water
            if val > 0.1:
                category = "high"
            elif val > 0.0:
                category = "medium"
            else:
                category = "low"

            # Normalise to 0–1 probability for map colouring
            probability = round(min(max((val + 0.2) / 0.5, 0.0), 1.0), 3)

            enriched.append({
                **cell,
                "ndbi_value":  round(val, 4),
                "category":    category,
                "probability": probability,
                "features": {
                    "ndbi": round(val, 4),
                },
            })

        return enriched

    except Exception as e:
        print(f"[PC] Grid sampling failed: {e}")
        return [
            {**c, "ndbi_value": None, "category": "low",
             "probability": 0.0, "features": {"ndbi": None}}
            for c in grid_cells
        ]


# ── Main entry point ──────────────────────────────────────────────────────────

def run_historical_prediction(
    coordinates:      list[list[float]],
    start_year:       int,
    end_year:         int,
    cell_size_meters: int = 500,
) -> dict:
    """
    Full historical urbanization analysis using Landsat archive.

    Args:
        coordinates:      AOI polygon as [[lat, lng], ...]
        start_year:       First year to analyse (≥ 2013 for Landsat 8)
        end_year:         Last year to analyse
        cell_size_meters: Grid cell size in metres

    Returns:
        status, time_series, per-cell predictions, summary
    """
    from app.services.grid_service import create_grid

    bbox       = _build_bbox(coordinates)
    grid_cells = create_grid(coordinates, cell_size_meters)

    if not grid_cells:
        return {"status": "error",
                "message": "No grid cells generated — AOI may be too small."}

    catalog = pystac_client.Client.open(
        CATALOG_URL,
        modifier=planetary_computer.sign_inplace,
    )

    time_series  = []
    latest_bands = None

    for year in range(start_year, end_year + 1):
        print(f"[PC] Processing {year}...")

        item = _find_best_item(catalog, bbox, year)
        if item is None:
            print(f"[PC] No suitable scene found for {year} — skipping")
            continue

        bands = _load_bands(item, bbox)
        if bands is None:
            continue

        stats = _scene_stats(bands)
        if stats is None:
            continue

        scene_date = (
            item.datetime.strftime("%Y-%m-%d")
            if item.datetime else f"{year}-01-01"
        )

        time_series.append({
            "year":        year,
            "ndbi_mean":   stats["ndbi_mean"],
            "ndvi_mean":   stats["ndvi_mean"],
            "urban_pct":   stats["urban_pct"],
            "cloud_cover": round(item.properties.get("eo:cloud_cover", 0), 1),
            "scene_date":  scene_date,
        })

        latest_bands = bands   # keep the last successful load for grid

    if not time_series:
        return {
            "status":  "error",
            "message": (
                "No valid Landsat scenes found for this area and year range. "
                "Try a larger AOI, wider year range, or different location."
            ),
        }

    # Per-cell NDBI grid from the latest year
    predictions = _build_ndbi_grid(latest_bands, grid_cells)

    # Summary statistics
    first = time_series[0]
    last  = time_series[-1]
    change_pct = round(last["urban_pct"] - first["urban_pct"], 2)
    ndbi_change = round(last["ndbi_mean"] - first["ndbi_mean"], 4)
    trend = (
        "increasing" if change_pct >  2 else
        "decreasing" if change_pct < -2 else
        "stable"
    )

    return {
        "status":      "success",
        "time_series": time_series,
        "predictions": predictions,
        "grid_info": {
            "total_cells": len(predictions),
            "cell_size_m": cell_size_meters,
        },
        "summary": {
            "years_analyzed":  len(time_series),
            "start_year":      first["year"],
            "end_year":        last["year"],
            "ndbi_start":      first["ndbi_mean"],
            "ndbi_end":        last["ndbi_mean"],
            "ndbi_change":     ndbi_change,
            "ndvi_start":      first["ndvi_mean"],
            "ndvi_end":        last["ndvi_mean"],
            "urban_pct_start": first["urban_pct"],
            "urban_pct_end":   last["urban_pct"],
            "change_pct":      change_pct,
            "trend":           trend,
        },
    }