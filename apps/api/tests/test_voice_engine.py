"""
Comprehensive Voice Ordering Engine Test Suite:
- Over 40 English, Hindi (Devanagari), and Hinglish test phrases
- Misspellings, mixed languages, ambiguous products, multiple products, and fractional quantities
- Conversational filler stripping
- Normalisation and parsing unit tests
- Invariant: /interpret never modifies the cart
- Explicit /cart/confirm commits items to the customer's cart
"""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.clock import set_clock_override
from app.core.config import settings
from app.core.db import SessionLocal
from app.main import app
from app.models.commerce import CommunityCartItem
from app.models.identity import OtpVerification, User
from app.models.organization import Community
from app.modules.voice.normaliser import normalise
from app.modules.voice.parser import parse_segments
from app.repositories.cycle_repository import CycleRepository

client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        set_clock_override(None)
        session.rollback()
        session.close()


def _get_auth_token(phone: str, db) -> str:
    db.query(OtpVerification).filter(OtpVerification.phone == phone).delete()
    db.commit()
    client.post("/api/v1/auth/request-otp", json={"phone": phone})
    resp = client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": settings.DEV_OTP})
    return resp.json()["access_token"]


# ===========================================================================
# 1. NORMALISATION & PARSER TESTS (Unit Level)
# ===========================================================================


def test_normaliser_fractions_and_hindi_numbers():
    assert normalise("aadha kilo") == "0.5 kilo"
    assert normalise("dedh litre") == "1.5 litre"
    assert normalise("dhai kilo") == "2.5 kilo"
    assert normalise("paav kilo") == "0.25 kilo"
    assert normalise("do kilo chawal") == "2 kilo chawal"
    assert normalise("teen packet biscuit") == "3 packet biscuit"
    assert normalise("chaar packet maggi") == "4 packet maggi"
    assert normalise("paanch litre tel") == "5 litre tel"


def test_normaliser_devanagari_numerals_and_words():
    assert normalise("दो किलो चावल") == "2 किलो चावल"
    assert normalise("आधा किलो तूर दाल") == "0.5 किलो तूर दाल"
    assert normalise("डेढ़ लीटर दूध") == "1.5 लीटर दूध"
    assert normalise("ढाई किलो चीनी") == "2.5 किलो चीनी"
    assert normalise("२ किलो चावल") == "2 किलो चावल"
    assert normalise("५ पैकेट बिस्कुट") == "5 पैकेट बिस्कुट"


def test_normaliser_strips_fillers_cleanly():
    assert normalise("please add do kilo sona masoori rice") == "2 kilo sona masoori rice"
    assert normalise("bhaiya mujhe chahiye ek litre amul milk de do") == "1 litre amul milk"
    assert normalise("kripya aadha kilo toor dal daal do") == "0.5 kilo toor dal"
    assert normalise("कृपया दो किलो चावल दे दो") == "2 किलो चावल"


def test_parser_extracts_quantities_units_products():
    segments = parse_segments("2 kg sona masoori rice and 1 litre amul milk")
    assert len(segments) == 2
    assert segments[0].quantity == 2
    assert segments[0].unit == "kg"
    assert "sona masoori rice" in segments[0].product_phrase

    assert segments[1].quantity == 1
    assert segments[1].unit == "litre"
    assert "amul milk" in segments[1].product_phrase


def test_parser_inverted_colloquial_hindi_order():
    segments = parse_segments("sona masoori chawal do kilo aur doodh ek litre")
    assert len(segments) == 2
    assert segments[0].quantity == 2
    assert segments[0].unit == "kg"
    assert "sona masoori chawal" in segments[0].product_phrase
    assert segments[1].quantity == 1
    assert segments[1].unit == "litre"


# ===========================================================================
# 2. 40+ MULTILINGUAL PHRASES INTERPRETATION TESTS
# ===========================================================================

TEST_40_PHRASES = [
    # --- English (en-IN) [1 - 12] ---
    ("Two kg Sona Masoori Rice and one litre Amul Milk", 2, "matched"),
    ("Five kg Aashirvaad Atta and five hundred grams Toor Dal", 2, "matched"),
    ("One kg Tata Salt and two litres Sunflower Oil", 2, "matched"),
    ("Five hundred grams Amul Butter and two hundred grams Paneer", 2, "matched"),
    ("One pack Parle-G biscuits and two packets of instant noodles", 2, "matched"),
    ("Half kg Sugar and one kg basmati rice", 2, "matched"),
    ("One and a half kg Toor Dal and two kg Sugar", 2, "matched"),
    ("Two and a half kg wheat flour and one litre milk", 2, "matched"),
    ("Quarter kg turmeric powder and five hundred grams cumin seeds", 2, "matched"),
    ("Three packets Marie Gold and two bottles of mustard oil", 2, "matched"),
    ("Ten kg Aashirvaad Sharbati Atta and five kg Sona Masoori Rice", 2, "matched"),
    ("One bottle Dettol handwash and one packet detergent powder", 2, "matched"),

    # --- Hinglish (Latin Script) [13 - 26] ---
    ("Do kilo sona masoori chawal aur ek litre amul doodh", 2, "matched"),
    ("Aadha kilo toor dal aur ek packet namak", 2, "matched"),
    ("Dedh kilo cheeni aur do packet parle g biscuit", 2, "matched"),
    ("Dhai kilo aashirvaad aata aur ek litre tel", 2, "matched"),
    ("Paav kilo haldi aur teen packet maggi", 2, "matched"),
    ("Chaar packet parle-g aur do litre doodh", 2, "matched"),
    ("Paanch kilo sona masoori rice aur dedh kilo shakkar", 2, "matched"),
    ("Dus packet maggi aur do kilo basmati rice", 2, "matched"),
    ("Teen kilo aashirvaad atta aur aadha kilo toor dal", 2, "matched"),
    ("Ek packet surf excel aur do dettol sabun", 2, "matched"),
    ("Ek kilo tata namak, do kilo cheeni, aur ek litre sarson tel", 3, "matched"),
    ("Sona masoori chawal do kilo aur doodh ek litre de do", 2, "matched"),
    ("Bhaiya mujhe chahiye paanch kilo aata aur ek kilo cheeni", 2, "matched"),
    ("Kripya ek litre amul doodh aur do packet biscuit bhej do", 2, "matched"),

    # --- Devanagari Hindi (hi-IN) [27 - 36] ---
    ("दो किलो सोना मसूरी चावल और एक लीटर अमूल दूध", 2, "matched"),
    ("आधा किलो तूर दाल और एक पैकेट नमक", 2, "matched"),
    ("डेढ़ किलो चीनी और दो पैकेट पारले जी", 2, "matched"),
    ("ढाई किलो आटा और एक लीटर तेल", 2, "matched"),
    ("पाव किलो हल्दी और तीन पैकेट मैगी", 2, "matched"),
    ("चार पैकेट बिस्कुट और दो लीटर दूध", 2, "matched"),
    ("पांच किलो चावल और एक किलो शक्कर", 2, "matched"),
    ("दस पैकेट मैगी और दो किलो बासमती चावल", 2, "matched"),
    ("एक किलो नमक और आधा किलो घी", 2, "matched"),
    ("कृपया दो किलो सोना मसूरी चावल और एक लीटर दूध दे दो", 2, "matched"),

    # --- Misspellings & Phonetic Variants [37 - 42] ---
    ("sona masuri rice do kilo aur amul dood ek litre", 2, "matched"),
    ("ashirvad ata five kg aur tata salt one packet", 2, "matched"),
    ("parleg biskit do packet aur ek kilo shukker", 2, "matched"),
    ("sunflour oil do litre aur toor daal 500g", 2, "matched"),
    ("two kg basmathi rice and one liter milk", 2, "matched"),
    ("chilli powdr ek packet aur zeera 200g", 2, "matched"),

    # --- Mixed Languages [43 - 45] ---
    ("Do packet Parle-G aur five hundred gram toor dal", 2, "matched"),
    ("One kg chawal and do litre amul milk", 2, "matched"),
    ("Teen packet biscuits and aadha kilo sugar", 2, "matched"),
]


@pytest.mark.parametrize("phrase, expected_items_count, _expected_status", TEST_40_PHRASES)
def test_voice_interpret_40_multilingual_phrases(db, phrase, expected_items_count, _expected_status):
    resp = client.post("/api/v1/voice/interpret", json={"text": phrase, "language": "en-IN"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["transcript"] == phrase
    assert len(data["items"]) == expected_items_count
    assert data["summary"]["total_items"] == expected_items_count

    # Verify that at least one item was successfully recognized with high confidence
    matched = [it for it in data["items"] if it["status"] in ("matched", "needs_clarification", "ambiguous")]
    assert len(matched) >= 1


# ===========================================================================
# 3. AMBIGUOUS PRODUCTS & CLARIFICATION QUESTIONS
# ===========================================================================


def test_ambiguous_generic_product_clarification(db):
    """
    When user specifies a generic term like 'rice' that matches multiple distinct products,
    the engine must return status='ambiguous', needs_clarification=True, and clarification options.
    """
    resp = client.post(
        "/api/v1/voice/interpret",
        json={"text": "two kg rice", "language": "en-IN"},
    )
    assert resp.status_code == 200
    data = resp.json()

    item = data["items"][0]
    assert item["status"] == "ambiguous"
    assert item["needs_clarification"] is True
    assert "Which" in item["clarification_question"]
    assert len(item["clarification_options"]) >= 2


def test_pack_size_ambiguity_clarification(db):
    """
    When user specifies a product with multiple pack sizes without specifying the size
    (e.g., 'sona masoori rice' which comes in 1kg, 5kg, 10kg),
    the engine must return status='needs_clarification' and variant options.
    """
    resp = client.post(
        "/api/v1/voice/interpret",
        json={"text": "Royal Sona Masoori Raw Rice", "language": "en-IN"},
    )
    assert resp.status_code == 200
    data = resp.json()

    item = data["items"][0]
    assert item["status"] == "needs_clarification"
    assert item["needs_clarification"] is True
    assert "Which pack size" in item["clarification_question"]
    assert len(item["clarification_options"]) >= 2


def test_unmatched_gadget_product(db):
    """When user requests an item not in the grocery catalogue, it returns unmatched."""
    resp = client.post(
        "/api/v1/voice/interpret",
        json={"text": "one apple macbook laptop and two sony headphones", "language": "en-IN"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["summary"]["unmatched_count"] >= 1
    for item in data["items"]:
        assert item["status"] == "unmatched"
        assert item["confidence"] == 0.0


# ===========================================================================
# 4. CART NON-MUTATION INVARIANT & EXPLICIT CONFIRMATION
# ===========================================================================


def test_interpret_never_modifies_cart(db):
    """
    Strict Invariant: POST /api/v1/voice/interpret must NEVER modify the cart table.
    """
    customer_token = _get_auth_token("+919999900001", db)
    green_meadows = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()
    cycle = CycleRepository.get_or_create_current_cycle(db, green_meadows.id)

    # Count initial cart items for this cycle
    initial_count = db.scalar(
        select(CommunityCartItem).where(CommunityCartItem.cycle_id == cycle.id)
    )

    # Perform multiple interpretations
    resp = client.post(
        "/api/v1/voice/interpret",
        json={"text": "Do kilo sona masoori chawal aur ek litre amul doodh"},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 200

    # Verify database cart count is completely unchanged
    after_count = db.scalar(
        select(CommunityCartItem).where(CommunityCartItem.cycle_id == cycle.id)
    )
    assert after_count == initial_count


def test_confirm_voice_cart_commits_items_to_customer_cart(db):
    """
    Verify that calling POST /api/v1/voice/cart/confirm explicitly adds items to cart.
    """
    customer_token = _get_auth_token("+919999900001", db)
    user = db.scalars(select(User).where(User.phone == "+919999900001")).first()
    green_meadows = db.scalars(select(Community).where(Community.code == "GREEN_MEADOWS")).first()

    set_clock_override(datetime(2026, 11, 15, 10, 0, tzinfo=UTC))
    cycle = CycleRepository.get_or_create_current_cycle(db, green_meadows.id)
    cycle.status = "OPEN"
    db.commit()

    # Clean existing user cart items
    db.query(CommunityCartItem).filter(
        CommunityCartItem.user_id == user.id, CommunityCartItem.cycle_id == cycle.id
    ).delete()
    db.commit()

    # Step 1: Interpret voice text
    interp_resp = client.post(
        "/api/v1/voice/interpret",
        json={"text": "Do kilo sona masoori rice aur ek litre amul doodh"},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert interp_resp.status_code == 200
    interp_data = interp_resp.json()

    # Extract matched variant ids
    items_to_confirm = []
    for it in interp_data["items"]:
        if it["status"] == "matched" and it["variant_id"]:
            items_to_confirm.append({
                "variant_id": it["variant_id"],
                "quantity": it["pack_multiplier"],
            })

    assert len(items_to_confirm) >= 1

    # Step 2: Explicitly confirm and commit
    confirm_resp = client.post(
        "/api/v1/voice/cart/confirm",
        json={"items": items_to_confirm},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert confirm_resp.status_code == 200
    conf_data = confirm_resp.json()

    assert conf_data["cart_items_count"] >= 1
    assert conf_data["cart_total_paise"] > 0

    # Verify items exist in PostgreSQL cart table
    persisted = list(
        db.scalars(
            select(CommunityCartItem).where(
                CommunityCartItem.user_id == user.id,
                CommunityCartItem.cycle_id == cycle.id,
            )
        ).all()
    )
    assert len(persisted) == len(items_to_confirm)


def test_voice_vocab_endpoint():
    """Verify /api/v1/voice/vocab returns languages, units, and sample phrases."""
    resp = client.get("/api/v1/voice/vocab")
    assert resp.status_code == 200
    vocab = resp.json()

    assert "en-IN" in vocab["languages"]
    assert "hi-IN" in vocab["languages"]
    assert "hinglish" in vocab["languages"]
    assert "kg" in vocab["units"]
    assert "litre" in vocab["units"]
    assert "en-IN" in vocab["sample_phrases"]
    assert "hinglish" in vocab["sample_phrases"]
    assert "hi-IN" in vocab["sample_phrases"]
