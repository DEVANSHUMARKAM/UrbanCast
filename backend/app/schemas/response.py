from pydantic import BaseModel
from typing import Optional


# ── Math prediction response ──────────────────────────────────────────────────

class CellFeatures(BaseModel):
    dist_center_km: float
    dist_road_km:   Optional[float]
    score_center:   float
    score_road:     float
    influence_km:   float


class CellPrediction(BaseModel):
    cell_id:     int
    center:      list[float]
    corners:     list[list[float]]
    probability: float
    category:    str
    features:    CellFeatures


class CityInfo(BaseModel):
    name:        str
    state:       str
    distance_km: float


class RoadInfo(BaseModel):
    available:     bool
    road_count:    int
    segment_count: int


class GridInfo(BaseModel):
    cell_size_m: int
    total_cells: int
    diagonal_km: float
    influence_km: float


class SummaryInfo(BaseModel):
    high:       int
    medium:     int
    low:        int
    high_pct:   float
    medium_pct: float
    low_pct:    float


class PredictResponse(BaseModel):
    status:      str
    city:        CityInfo
    roads:       RoadInfo
    grid:        GridInfo
    weights:     dict
    summary:     SummaryInfo
    predictions: list[CellPrediction]


class CityResult(BaseModel):
    name:  str
    key:   str
    lat:   float
    lng:   float
    state: str


# ── Historical prediction response ────────────────────────────────────────────

class YearDataPoint(BaseModel):
    year:        int
    ndbi_mean:   float
    ndvi_mean:   float
    urban_pct:   float
    cloud_cover: float
    scene_date:  str


class HistoricalCellFeatures(BaseModel):
    ndbi: Optional[float]


class HistoricalCell(BaseModel):
    id:          int
    center:      list[float]
    corners:     list[list[float]]
    ndbi_value:  Optional[float]
    category:    str
    probability: float
    features:    HistoricalCellFeatures


class HistoricalGridInfo(BaseModel):
    total_cells: int
    cell_size_m: int


class HistoricalSummary(BaseModel):
    years_analyzed:  int
    start_year:      int
    end_year:        int
    ndbi_start:      float
    ndbi_end:        float
    ndbi_change:     float
    ndvi_start:      float
    ndvi_end:        float
    urban_pct_start: float
    urban_pct_end:   float
    change_pct:      float
    trend:           str


class HistoricalResponse(BaseModel):
    status:      str
    time_series: list[YearDataPoint]
    predictions: list[HistoricalCell]
    grid_info:   HistoricalGridInfo
    summary:     HistoricalSummary