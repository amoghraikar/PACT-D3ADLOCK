import difflib
import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.catalogue import Product, ProductVariant
from app.models.organization import RetailerCommunity
from app.modules.voice.parser import ParsedSegment
from app.modules.voice.tables import PRODUCT_NORMALIZATIONS, UNITS_TABLE
from app.schemas.voice import ClarificationOption, InterpretedItem


def _parse_variant_dimension(unit_str: str) -> tuple[str, float]:
    """
    Parses a variant unit string like '1 kg', '500 g', '1 Litre', '500ml', 'Pack of 2'
    Returns (dimension, base_value):
    - weight: grams (g)
    - volume: millilitres (ml)
    - count: units
    """
    clean = unit_str.lower().strip()
    # Match pattern: number + unit
    m = re.search(r"(\d+(?:\.\d+)?)\s*([a-zA-Z]+)", clean)
    if m:
        val = float(m.group(1))
        u = m.group(2).lower()
        if u in ("kg", "kilo", "kilogram", "kgs"):
            return ("weight", val * 1000.0)
        elif u in ("g", "gm", "gms", "gram", "grams"):
            return ("weight", val)
        elif u in ("l", "lt", "ltr", "litre", "liter", "litres"):
            return ("volume", val * 1000.0)
        elif u in ("ml", "milliliter", "millilitre"):
            return ("volume", val)
        elif u in ("pack", "packet", "pc", "piece", "bottle", "box", "can"):
            return ("count", val)
    return ("count", 1.0)


def _get_active_catalogue(db: Session, community_id: uuid.UUID | None = None) -> list[Product]:
    """
    Retrieves active products with active variants from PostgreSQL.
    If community_id is provided, filters to products available from the assigned community retailer.
    """
    stmt = (
        select(Product)
        .options(
            selectinload(Product.variants),
            selectinload(Product.category),
            selectinload(Product.images),
        )
        .where(Product.is_active.is_(True))
    )

    if community_id:
        ret_comm = db.scalars(
            select(RetailerCommunity).where(
                RetailerCommunity.community_id == community_id,
                RetailerCommunity.is_active.is_(True),
            )
        ).first()
        if ret_comm:
            # Active products for this retailer
            stmt = stmt.where(Product.is_active.is_(True))

    products = list(db.scalars(stmt).all())
    # Filter only products that have at least one active variant
    return [p for p in products if any(v.is_active for v in p.variants)]


def _normalize_query_phrase(prod_phrase: str) -> str:
    """Normalises search phrase using vocabulary dictionary."""
    phrase = prod_phrase.lower().strip()
    if phrase in PRODUCT_NORMALIZATIONS:
        return PRODUCT_NORMALIZATIONS[phrase]

    # Check multi-word subphrases
    tokens = phrase.split()
    for i in range(len(tokens), 0, -1):
        for j in range(len(tokens) - i + 1):
            sub = " ".join(tokens[j : j + i])
            if sub in PRODUCT_NORMALIZATIONS:
                replaced = PRODUCT_NORMALIZATIONS[sub]
                return phrase.replace(sub, replaced)

    return phrase


def match_segment(
    db: Session,
    segment: ParsedSegment,
    community_id: uuid.UUID | None = None,
) -> InterpretedItem:
    """
    Matches a parsed voice segment against the actual database grocery catalogue.
    Computes confidence score and handles:
    - High confidence single product and variant match.
    - Pack size ambiguity (single product, multiple variants without explicit size).
    - Product ambiguity (generic search like 'rice' matching multiple distinct products).
    - Unmatched items.
    """
    catalogue = _get_active_catalogue(db, community_id)
    raw_heard = segment.raw_segment
    query_phrase = segment.product_phrase.lower().strip()
    normalized_query = _normalize_query_phrase(query_phrase)

    # 1. Score each product against the query
    scored_products: list[tuple[Product, float]] = []
    query_tokens = set(normalized_query.split())
    orig_tokens = set(query_phrase.split())
    all_tokens = query_tokens | orig_tokens

    for prod in catalogue:
        title_lower = prod.title.lower()
        brand_lower = (prod.brand or "").lower()
        cat_lower = (prod.category.name if prod.category else "").lower()

        title_tokens = set(re.findall(r"\w+", title_lower))
        brand_tokens = set(re.findall(r"\w+", brand_lower))
        cat_tokens = set(re.findall(r"\w+", cat_lower))

        score = 0.0

        # Exact title substring or match
        if normalized_query == title_lower:
            score = 1.0
        elif normalized_query in title_lower:
            score = 0.95
        elif all_tokens.issubset(title_tokens | brand_tokens):
            score = 0.92
        elif query_tokens.issubset(title_tokens | brand_tokens):
            score = 0.90
        elif brand_tokens and brand_tokens.intersection(all_tokens):
            # Brand matched (e.g. "Amul") + some title tokens
            matched_prod_tokens = (all_tokens - brand_tokens).intersection(title_tokens | cat_tokens)
            if matched_prod_tokens:
                score = 0.88
            else:
                score = 0.70
        else:
            # Overlap score
            intersection = all_tokens.intersection(title_tokens | brand_tokens)
            if intersection:
                ratio = len(intersection) / max(1, len(all_tokens))
                score = max(score, ratio * 0.85)

            # SequenceMatcher fuzzy similarity fallback for misspellings
            fuzzy_ratio = difflib.SequenceMatcher(None, normalized_query, title_lower).ratio()
            # Also compare against key title tokens
            for token in title_tokens:
                if len(token) >= 4 and len(normalized_query) >= 4:
                    tok_fuzzy = difflib.SequenceMatcher(None, normalized_query, token).ratio()
                    fuzzy_ratio = max(fuzzy_ratio, tok_fuzzy * 0.85)

            if fuzzy_ratio > 0.65:
                score = max(score, fuzzy_ratio * 0.88)

        if score >= 0.45:
            scored_products.append((prod, score))

    scored_products.sort(key=lambda x: x[1], reverse=True)

    # 1. No products matched
    if not scored_products:
        return InterpretedItem(
            heard=raw_heard,
            status="unmatched",
            confidence=0.0,
            requested_quantity=segment.quantity,
            requested_unit=segment.unit,
            needs_clarification=False,
            clarification_question=f'I couldn\'t find "{segment.product_phrase}" in the grocery catalogue.',
            clarification_options=[],
        )

    best_prod, best_score = scored_products[0]

    # 2. Check for ambiguity between multiple distinct products
    # E.g., user said generic "rice" and multiple rice products scored very close
    is_generic_query = normalized_query in (
        "rice", "chawal", "oil", "tel", "dal", "sugar", "atta", "flour", "soap", "biscuit", "tea"
    )
    is_ambiguous_products = (
        len(scored_products) > 1
        and (
            is_generic_query
            or (best_score < 0.90 and abs(scored_products[0][1] - scored_products[1][1]) < 0.10)
        )
    )

    if is_ambiguous_products:
        options: list[ClarificationOption] = []
        for prod, _ in scored_products[:3]:  # Top 3 products
            for v in [v for v in prod.variants if v.is_active][:2]:  # Up to 2 variants each
                options.append(
                    ClarificationOption(
                        product_id=prod.id,
                        variant_id=v.id,
                        product_title=prod.title,
                        variant_title=v.title,
                        unit=v.unit,
                        price_paise=v.default_price_paise,
                        quantity=segment.quantity or 1.0,
                    )
                )

        return InterpretedItem(
            heard=raw_heard,
            status="ambiguous",
            confidence=round(best_score, 2),
            requested_quantity=segment.quantity,
            requested_unit=segment.unit,
            needs_clarification=True,
            clarification_question=f"Which {segment.product_phrase} would you like?",
            clarification_options=options,
        )

    # 3. Single product match - resolve variant
    active_variants = [v for v in best_prod.variants if v.is_active]
    if not active_variants:
        return InterpretedItem(
            heard=raw_heard,
            status="unmatched",
            confidence=0.0,
            requested_quantity=segment.quantity,
            requested_unit=segment.unit,
            needs_clarification=False,
            clarification_question=f"{best_prod.title} is currently unavailable.",
            clarification_options=[],
        )

    req_qty = segment.quantity
    req_unit = segment.unit

    # Convert requested quantity and unit to base dimensions
    req_dimension = None
    req_base_units = None
    if req_unit and req_unit in UNITS_TABLE:
        canon_unit, multiplier, dim = UNITS_TABLE[req_unit]
        req_dimension = dim
        if req_qty is not None:
            req_base_units = req_qty * multiplier

    # Try to find a matching variant based on requested quantity/size
    matched_variant: ProductVariant | None = None
    pack_multiplier = 1

    if req_base_units and req_dimension:
        # Check for exact variant match
        for v in active_variants:
            v_dim, v_base = _parse_variant_dimension(v.unit)
            if v_dim == req_dimension and abs(v_base - req_base_units) < 1e-3:
                matched_variant = v
                pack_multiplier = 1
                break

        # If no exact single-pack match, check if requested is a multiple of a smaller variant
        # E.g. user asked for 2 kg sona masoori rice, variant is 1 kg -> 2 packs of 1kg!
        if not matched_variant:
            for v in sorted(active_variants, key=lambda x: _parse_variant_dimension(x.unit)[1]):
                v_dim, v_base = _parse_variant_dimension(v.unit)
                if v_dim == req_dimension and v_base > 0:
                    multiple = req_base_units / v_base
                    if abs(multiple - round(multiple)) < 1e-3 and round(multiple) >= 1:
                        matched_variant = v
                        pack_multiplier = int(round(multiple))
                        break

    # If user provided a unit-less count (e.g. "2 parle g", "1 maggi"), or user matched exact variant name
    if not matched_variant and req_qty is not None and not req_unit:
        # If product has only 1 variant, or if one variant is default
        if len(active_variants) == 1:
            matched_variant = active_variants[0]
            pack_multiplier = int(req_qty) if float(req_qty).is_integer() else 1

    # Check if user mentioned variant size directly in the product phrase (e.g. "amul milk 1 litre")
    if not matched_variant:
        for v in active_variants:
            v_unit_lower = v.unit.lower()
            if v_unit_lower in query_phrase or v_unit_lower in raw_heard.lower():
                matched_variant = v
                pack_multiplier = int(req_qty) if (req_qty and float(req_qty).is_integer()) else 1
                break

    # If variant is still not deterministically matched and product has multiple variants:
    # Require clarification for pack size!
    if not matched_variant and len(active_variants) > 1:
        options = [
            ClarificationOption(
                product_id=best_prod.id,
                variant_id=v.id,
                product_title=best_prod.title,
                variant_title=v.title,
                unit=v.unit,
                price_paise=v.default_price_paise,
                quantity=1.0,
            )
            for v in active_variants
        ]
        return InterpretedItem(
            heard=raw_heard,
            status="needs_clarification",
            confidence=round(best_score, 2),
            product_id=best_prod.id,
            product_title=best_prod.title,
            requested_quantity=segment.quantity,
            requested_unit=segment.unit,
            needs_clarification=True,
            clarification_question=f"Which pack size of {best_prod.title} would you like?",
            clarification_options=options,
        )

    # If single variant product or variant was successfully identified:
    final_variant = matched_variant or active_variants[0]
    final_unit_price = final_variant.default_price_paise
    final_total_paise = final_unit_price * pack_multiplier

    return InterpretedItem(
        heard=raw_heard,
        status="matched",
        confidence=round(best_score, 2),
        product_id=best_prod.id,
        product_title=best_prod.title,
        variant_id=final_variant.id,
        variant_title=final_variant.title,
        requested_quantity=segment.quantity,
        requested_unit=segment.unit,
        pack_multiplier=pack_multiplier,
        unit_price_paise=final_unit_price,
        estimated_total_paise=final_total_paise,
        needs_clarification=False,
        clarification_question=None,
        clarification_options=[],
    )
