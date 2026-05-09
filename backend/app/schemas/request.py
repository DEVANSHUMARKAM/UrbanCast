from pydantic import BaseModel, field_validator
from typing import Annotated
from annotated_types import Ge, Le
import datetime


class PredictRequest(BaseModel):
    coordinates:      list[list[float]]
    cell_size_meters: Annotated[int,   Ge(100), Le(2000)] = 500
    weight_center:    Annotated[float, Ge(0.0), Le(1.0)]  = 0.4
    weight_roads:     Annotated[float, Ge(0.0), Le(1.0)]  = 0.6

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, v):
        if len(v) < 4:
            raise ValueError("Polygon must have at least 4 coordinate pairs.")
        for pair in v:
            if len(pair) != 2:
                raise ValueError("Each coordinate must be [lat, lng].")
            lat, lng = pair
            if not (-90 <= lat <= 90):
                raise ValueError(f"Invalid latitude: {lat}")
            if not (-180 <= lng <= 180):
                raise ValueError(f"Invalid longitude: {lng}")
        return v

    @field_validator("weight_center", "weight_roads")
    @classmethod
    def validate_weights(cls, v):
        return round(v, 2)


class HistoricalRequest(BaseModel):
    coordinates:      list[list[float]]
    start_year:       Annotated[int, Ge(2013), Le(2024)] = 2015
    end_year:         Annotated[int, Ge(2013), Le(2024)] = 2023
    cell_size_meters: Annotated[int, Ge(100),  Le(2000)] = 500

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, v):
        if len(v) < 4:
            raise ValueError("Polygon must have at least 4 coordinate pairs.")
        for pair in v:
            if len(pair) != 2:
                raise ValueError("Each coordinate must be [lat, lng].")
            lat, lng = pair
            if not (-90 <= lat <= 90):
                raise ValueError(f"Invalid latitude: {lat}")
            if not (-180 <= lng <= 180):
                raise ValueError(f"Invalid longitude: {lng}")
        return v

    @field_validator("end_year")
    @classmethod
    def validate_year_range(cls, v, info):
        start = info.data.get("start_year", 2013)
        if v < start:
            raise ValueError("end_year must be >= start_year.")
        if v - start > 10:
            raise ValueError("Year range cannot exceed 10 years.")
        return v


class CitySearchRequest(BaseModel):
    query: str