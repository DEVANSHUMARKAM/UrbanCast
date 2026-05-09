from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.api.routes.predict import router as predict_router

settings = get_settings()

app = FastAPI(
    title="UrbanCast API",
    version="1.0.0",
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


app.include_router(predict_router, prefix="/api")


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "env": settings.ENV,
        "version": "1.0.0",
    }