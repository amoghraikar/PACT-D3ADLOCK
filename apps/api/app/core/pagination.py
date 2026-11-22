"""
Shared pagination and response schemas.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedMeta(BaseModel):
    total: int
    page: int
    limit: int
    pages: int

    @classmethod
    def from_total(cls, total: int, page: int, limit: int) -> "PaginatedMeta":
        pages = max(1, (total + limit - 1) // limit)
        return cls(total=total, page=page, limit=limit, pages=pages)


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    meta: PaginatedMeta
