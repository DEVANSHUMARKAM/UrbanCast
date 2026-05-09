from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    ENV: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173"
    DEFAULT_CELL_SIZE_METERS: int = 500
    OSM_TIMEOUT: int = 25

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()