import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.clock import now_utc
from app.core.config import settings
from app.core.db import get_db
from app.core.errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.middleware.request_context import RequestLoggingMiddleware
from app.modules.auth.router import router as auth_router
from app.modules.billing.router import router as billing_router
from app.modules.cart.router import router as cart_router
from app.modules.catalogue.router import router as catalogue_router
from app.modules.cycles.router import router as cycles_router
from app.modules.dev.router import router as dev_router
from app.modules.inventory.router import router as inventory_router
from app.modules.retailer.orders_router import router as retailer_orders_router

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

# Exception handlers (C6 Envelope standard: code, message, details)
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Request logging and tracing middleware
app.add_middleware(RequestLoggingMiddleware)

# CORS configuration supporting browser web, local development, and Capacitor mobile
_cors_origins = [
    settings.FRONTEND_URL,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "capacitor://localhost",
    "http://localhost",
    "https://localhost",
]
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
    """Global system health / liveness check."""
    return {
        "status": "healthy",
        "service": "pact-api",
        "environment": settings.ENVIRONMENT,
        "timestamp": now_utc().isoformat(),
    }


@app.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    """Global system readiness check verifying PostgreSQL database connectivity."""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "environment": settings.ENVIRONMENT,
            "timestamp": now_utc().isoformat(),
        }
    except Exception as exc:
        logger.error("Readiness check failed: %s", exc)
        return Response(
            content='{"status": "not_ready", "database": "disconnected"}',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json",
        )


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


@api_v1_router.get("/ready")
def api_v1_ready(db: Session = Depends(get_db)):
    """Versioned API v1 readiness check."""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "version": "v1",
            "database": "connected",
            "environment": settings.ENVIRONMENT,
            "timestamp": now_utc().isoformat(),
        }
    except Exception as exc:
        logger.error("API v1 readiness check failed: %s", exc)
        return Response(
            content='{"status": "not_ready", "version": "v1", "database": "disconnected"}',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json",
        )


# Mount Feature Routers
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_v1_router.include_router(catalogue_router, prefix="/catalogue", tags=["Catalogue"])
api_v1_router.include_router(inventory_router, prefix="/retailer", tags=["Retailer Inventory"])
api_v1_router.include_router(retailer_orders_router, prefix="/retailer", tags=["Retailer Orders"])
api_v1_router.include_router(cart_router, prefix="/cart", tags=["Collective Cart"])
api_v1_router.include_router(cycles_router, prefix="/cycles", tags=["Shopping Cycles"])
api_v1_router.include_router(billing_router, prefix="/billing", tags=["F7 Billing Engine"])
api_v1_router.include_router(dev_router, prefix="/dev", tags=["Development Controls"])

# Mount top-level versioned router
app.include_router(api_v1_router)
