from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Any | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Not signed in", code: str = "UNAUTHORIZED"):
        super().__init__(code=code, message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Access forbidden", code: str = "FORBIDDEN"):
        super().__init__(code=code, message=message, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(code=code, message=message, status_code=status.HTTP_404_NOT_FOUND)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict with current state", code: str = "CONFLICT"):
        super().__init__(code=code, message=message, status_code=status.HTTP_409_CONFLICT)


class ValidationError(AppError):
    def __init__(
        self,
        message: str = "Validation failed",
        code: str = "VALIDATION_ERROR",
        details: Any | None = None,
    ):
        super().__init__(
            code=code,
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


def error_response(
    code: str, message: str, status_code: int, details: Any | None = None
) -> JSONResponse:
    content = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        content["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=content)


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return error_response(
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details,
    )


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "UNAUTHORIZED"
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        code = "FORBIDDEN"
    elif exc.status_code == status.HTTP_404_NOT_FOUND:
        code = "NOT_FOUND"
    elif exc.status_code == status.HTTP_409_CONFLICT:
        code = "CONFLICT"

    message = exc.detail if isinstance(exc.detail, str) else "An error occurred"
    return error_response(code=code, message=message, status_code=exc.status_code)


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response(
        code="VALIDATION_ERROR",
        message="Invalid request data",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=exc.errors(),
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return error_response(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
