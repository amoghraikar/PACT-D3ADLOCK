import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ClarificationOption(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    variant_id: uuid.UUID
    product_id: uuid.UUID
    product_title: str
    variant_title: str
    unit: str  # e.g. "1 kg", "5 kg", "500 ml"
    price_paise: int
    quantity: float = 1.0


class InterpretedItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    heard: str
    status: str  # "matched", "needs_clarification", "ambiguous", "unmatched"
    confidence: float = Field(ge=0.0, le=1.0)
    product_id: uuid.UUID | None = None
    product_title: str | None = None
    variant_id: uuid.UUID | None = None
    variant_title: str | None = None
    requested_quantity: float | None = None
    requested_unit: str | None = None
    pack_multiplier: int = 1
    unit_price_paise: int | None = None
    estimated_total_paise: int | None = None
    needs_clarification: bool = False
    clarification_question: str | None = None
    clarification_options: list[ClarificationOption] = []


class VoiceInterpretationSummary(BaseModel):
    total_items: int
    matched_count: int
    clarification_needed_count: int
    unmatched_count: int
    estimated_total_paise: int


class VoiceInterpretRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Speech transcript in English, Hindi, or Hinglish")
    language: str = Field(default="en-IN", description="Speech language code: en-IN, hi-IN, or hinglish")
    community_id: uuid.UUID | None = Field(default=None, description="Optional community context for catalog filtering")


class VoiceInterpretResponse(BaseModel):
    transcript: str
    language: str
    items: list[InterpretedItem]
    summary: VoiceInterpretationSummary


class ConfirmVoiceCartItem(BaseModel):
    variant_id: uuid.UUID
    quantity: int = Field(..., ge=1, le=100)


class ConfirmVoiceCartRequest(BaseModel):
    items: list[ConfirmVoiceCartItem] = Field(..., min_length=1)


class ConfirmVoiceCartResponse(BaseModel):
    added_items: list[dict[str, Any]]
    cart_total_paise: int
    cart_items_count: int
    cycle_id: uuid.UUID


class VoiceVocabResponse(BaseModel):
    languages: list[str]
    units: list[str]
    sample_phrases: dict[str, list[str]]
    product_categories: list[str]
