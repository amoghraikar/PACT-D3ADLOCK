from fastapi import Depends, FastAPI, status
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
    error_response,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.modules.auth.router import onboarding_router
from app.modules.auth.router import router as auth_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="PACT Collective-Commerce Platform API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

# Global Error Handlers (C6 Envelope)
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# CORS middleware for local frontend Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(onboarding_router, prefix=settings.API_PREFIX)


@app.get("/")
def read_root():
    return {
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "time_utc": now_utc().isoformat(),
    }


@app.get(f"{settings.API_PREFIX}/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint that pings the PostgreSQL database.
    """
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        return error_response(
            code="DATABASE_UNAVAILABLE",
            message=f"Database ping failed: {e!s}",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return {
        "status": "healthy",
        "database": db_status,
        "timestamp": now_utc().isoformat(),
    }
