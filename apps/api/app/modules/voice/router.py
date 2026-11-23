from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_customer
from app.core.errors import UnauthorizedError
from app.core.security import compute_token_hash
from app.models.identity import User, UserSession
from app.modules.voice.interpreter import VoiceInterpreter
from app.schemas.voice import (
    ConfirmVoiceCartRequest,
    ConfirmVoiceCartResponse,
    VoiceInterpretRequest,
    VoiceInterpretResponse,
    VoiceVocabResponse,
)
from app.services.cart_service import CartService

router = APIRouter(prefix="/voice", tags=["voice"])


def get_current_user_optional(
    authorization: Annotated[str | None, Header()] = None,
    pact_session: Annotated[str | None, Cookie()] = None,
    db: Session = Depends(get_db),
) -> User | None:
    """Extracts authenticated user if credentials are provided, else returns None."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif pact_session:
        token = pact_session.strip()

    if not token:
        return None

    try:
        token_hash = compute_token_hash(token)
        session_record = db.scalars(
            UserSession.select_valid_session(token_hash)
        ).first()
        if session_record:
            return session_record.user
    except Exception:
        return None
    return None


@router.post(
    "/interpret",
    response_model=VoiceInterpretResponse,
    summary="Interpret speech transcript into structured grocery catalogue items",
)
def interpret_voice_order(
    payload: VoiceInterpretRequest,
    optional_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> VoiceInterpretResponse:
    """
    Interprets grocery order transcript in English (en-IN), Hindi (hi-IN), or Hinglish.
    - Extracts product names, numerical quantities, and measurement units.
    - Resolves colloquial Hindi/Hinglish vocabulary (chawal, doodh, tel, cheeni, etc.).
    - Matches items against active database catalogue products and variants.
    - Generates confidence scores and clarification questions for ambiguous items.
    - NEVER modifies the shopping cart.
    """
    target_community_id = payload.community_id
    if not target_community_id and optional_user:
        active_m = [
            m for m in (optional_user.memberships or []) if m.is_active and m.community_id
        ]
        if active_m:
            target_community_id = active_m[0].community_id

    return VoiceInterpreter.interpret(
        db=db,
        text=payload.text,
        language=payload.language,
        community_id=target_community_id,
    )


@router.post(
    "/cart/confirm",
    response_model=ConfirmVoiceCartResponse,
    summary="Explicitly confirm and commit voice-interpreted items into customer's cart",
)
def confirm_voice_cart(
    payload: ConfirmVoiceCartRequest,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
) -> ConfirmVoiceCartResponse:
    """
    Commits voice-interpreted items into the resident's active monthly community cart.
    Enforces cutoff boundary: returns HTTP 409 ORDER_CYCLE_LOCKED if monthly cutoff has passed.
    Never updates the cart without explicit invocation of this confirmation endpoint.
    """
    added_items = []
    last_cart_resp = None

    for item in payload.items:
        cart_resp = CartService.update_cart_item(
            db=db,
            user=current_user,
            variant_id=item.variant_id,
            quantity=item.quantity,
            notes="Added via Voice Ordering",
        )
        last_cart_resp = cart_resp
        added_items.append(
            {
                "variant_id": str(item.variant_id),
                "quantity": item.quantity,
            }
        )

    if not last_cart_resp:
        raise UnauthorizedError("No items were added.")

    return ConfirmVoiceCartResponse(
        added_items=added_items,
        cart_total_paise=last_cart_resp.personal_total_paise,
        cart_items_count=len(last_cart_resp.items),
        cycle_id=last_cart_resp.cycle.id,
    )


@router.get(
    "/vocab",
    response_model=VoiceVocabResponse,
    summary="Get supported voice languages, units, and sample phrases",
)
def get_voice_vocab() -> VoiceVocabResponse:
    """
    Returns supported language codes, recognized units, and guidance phrases.
    """
    return VoiceVocabResponse(
        languages=["en-IN", "hi-IN", "hinglish"],
        units=["kg", "g", "litre", "ml", "pack", "bottle", "box", "piece", "bag"],
        sample_phrases={
            "en-IN": [
                "Two kg Sona Masoori Rice and one litre Amul Milk",
                "Five kg Aashirvaad Atta and five hundred grams Toor Dal",
                "One pack Parle-G and two bottles of Sunflower Oil",
            ],
            "hinglish": [
                "Do kilo sona masoori chawal aur ek litre doodh",
                "Aadha kilo toor dal aur ek packet namak",
                "Dedh litre tel aur do packet biscuit de do",
                "Chaar packet maggi aur ek kilo cheeni",
            ],
            "hi-IN": [
                "दो किलो सोना मसूरी चावल और एक लीटर दूध",
                "आधा किलो तूर दाल और एक पैकेट नमक",
                "डेढ़ किलो चीनी और दो पैकेट बिस्कुट",
            ],
        },
        product_categories=[
            "Staples",
            "Rice and grains",
            "Pulses",
            "Dairy",
            "Oils",
            "Spices",
            "Snacks",
            "Beverages",
            "Personal care",
            "Household essentials",
            "Cleaning supplies",
        ],
    )
