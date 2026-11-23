"""
HTTP Request context and logging middleware for PACT API.
Injects X-Request-ID and logs latency and response status code.
"""

import logging
import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger("pact.http")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every HTTP request with method, path, status code, and duration.
    Injects an X-Request-ID header for tracing.
    """

    SKIP_PATHS = {"/", "/docs", "/openapi.json", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        # Retain client-provided request ID or generate a new one
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            log_level,
            "%s %s -> %d [%sms] req_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )

        return response
