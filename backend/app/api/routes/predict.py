from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.request  import PredictRequest, HistoricalRequest, CitySearchRequest
from app.schemas.response import PredictResponse, HistoricalResponse, CityResult
from app.services.prediction_engine  import run_prediction
from app.services.planetary_service  import run_historical_prediction
from app.services.city_registry      import search_cities

router = APIRouter(prefix="/predict", tags=["prediction"])


@router.post("/math", response_model=PredictResponse)
async def predict_math(payload: PredictRequest):
    result = run_prediction(
        coordinates=payload.coordinates,
        cell_size_meters=payload.cell_size_meters,
        weight_center=payload.weight_center,
        weight_roads=payload.weight_roads,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/historical", response_model=HistoricalResponse)
async def predict_historical(payload: HistoricalRequest):
    result = run_historical_prediction(
        coordinates=payload.coordinates,
        start_year=payload.start_year,
        end_year=payload.end_year,
        cell_size_meters=payload.cell_size_meters,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.get("/cities", response_model=list[CityResult])
async def search_cities_endpoint(q: str = ""):
    if len(q.strip()) < 2:
        raise HTTPException(
            status_code=400,
            detail="Query must be at least 2 characters."
        )
    return search_cities(q)