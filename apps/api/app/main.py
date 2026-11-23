import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.clock import now_utc
from app.core.config import settings
from app.core.errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.middleware import RequestLoggingMiddleware

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("pact.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PACT API starting up in [%s] mode...", settings.ENVIRONMENT)
    yield
    logger.info("PACT API shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="PACT Collective-Commerce Platform API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

# Exception handlers (C6 Envelope standard)
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# CORS — driven by environment configuration
_cors_origins = [settings.FRONTEND_URL, "http://127.0.0.1:3000", "http://localhost:3000"]
if settings.EXTRA_ORIGINS:
    _cors_origins.extend(o.strip() for o in settings.EXTRA_ORIGINS.split(",") if o.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.onrender\.com|https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Root metadata endpoint."""
    return {
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
        "status": "online",
        "time_utc": now_utc().isoformat(),
    }


@app.get("/health")
def health_check():
    """Global system health check."""
    return {
        "status": "healthy",
        "service": "pact-api",
        "environment": settings.ENVIRONMENT,
        "timestamp": now_utc().isoformat(),
    }


# Versioned /api/v1 routes
api_v1_router = APIRouter(prefix=settings.API_PREFIX)


@api_v1_router.get("/health")
def api_v1_health():
    """Versioned API v1 health check."""
    return {
        "status": "healthy",
        "version": "v1",
        "service": "pact-api",
        "environment": settings.ENVIRONMENT,
        "timestamp": now_utc().isoformat(),
    }


app.include_router(api_v1_router)
