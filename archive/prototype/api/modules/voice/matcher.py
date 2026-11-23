import difflib
from typing import Any
from app.modules.catalogue.router import PRODUCTS, RETAILER_LISTINGS
from app.modules.voice.parser import ParsedSegment
from app.modules.voice.tables import PRODUCT_ALIASES, UNITS_TABLE


def parse_variant_base_units(variant_label: str) -> tuple[str, float]:
    """
    Parses a variant label like '5 kg' or '500 g' or '1 L' into (dimension, base_units).
    Weight: base grams ('g')
    Volume: base ml ('ml')
    Count: base count ('pack')
    """
    parts = variant_label.strip().lower().split()
    if len(parts) >= 2:
        val = float(parts[0])
        unit_str = parts[1]
        if unit_str in ("kg", "kilo", "kilogram"):
            return ("weight", val * 1000.0)
        elif unit_str in ("g", "gm", "gram"):
            return ("weight", val)
        elif unit_str in ("l", "litre", "liter"):
            return ("volume", val * 1000.0)
        elif unit_str in ("ml",):
            return ("volume", val)
    return ("count", 1.0)


def get_community_visible_products(community_id: str) -> list[dict[str, Any]]:
    """
    Returns products and their active variants visible in this community.
    Green Meadows -> Sri Lakshmi Stores ('ret-ravi-1' / 'usr-ravi-21').
    Lakeview -> Daily Needs Mart ('ret-farah-2' / 'usr-farah-22').
    """
    retailer_id = "ret-farah-2" if "lake" in community_id.lower() else "ret-ravi-1"

    visible: list[dict[str, Any]] = []

    # Map products
    for prod in PRODUCTS:
        pid = prod["id"]
        # Check which variants are listed by this retailer
        variants = []
        for v in prod.get("variants", []):
            vid = v["id"]
            # Check listing
            listing = RETAILER_LISTINGS.get((retailer_id, vid)) or RETAILER_LISTINGS.get(("usr-ravi-21", vid))
            if listing and listing.get("availability") != "inactive":
                v_label = v.get("label") or v.get("variant_label", "")
                dim, base_val = parse_variant_base_units(v_label)
                variants.append({
                    "variant_id": vid,
                    "label": v_label,
                    "mrp_paise": listing.get("mrp_paise", 0),
                    "selling_price_paise": listing.get("selling_price_paise", 0),
                    "dimension": dim,
                    "base_units": base_val,
                })

        # If this product has at least one active variant at this retailer
        if variants:
            visible.append({
                "product_id": pid,
                "name": prod["name"],
                "category": prod.get("category"),
                "aliases": prod.get("aliases", []),
                "variants": variants,
            })

    return visible


def match_segment(
    segment: ParsedSegment,
    community_id: str = "comm-green-1",
) -> dict[str, Any]:
    """
    Applies F3 matching rules and variant rule to a parsed segment.
    """
    visible_products = get_community_visible_products(community_id)

    heard_text = segment.raw_segment
    prod_phrase = segment.product_phrase.lower().strip()

    # Resolve product alias
    canon_alias = PRODUCT_ALIASES.get(prod_phrase, prod_phrase)

    # 1. Prefer exact alias matches (e.g. 'rice', 'chawal', 'toor dal', 'sugar')
    alias_matched = [
        p for p in visible_products
        if any(a == prod_phrase or a == canon_alias for a in [al.lower() for al in p.get("aliases", [])])
    ]

    if alias_matched:
        matched_products = alias_matched
    else:
        # Fallback to name contains or generic matching
        matched_products = []
        for p in visible_products:
            p_name = p["name"].lower()
            p_aliases = [a.lower() for a in p["aliases"]]

            if (
                prod_phrase in p_name
                or p_name in prod_phrase
                or any(a == prod_phrase or a == canon_alias for a in p_aliases)
                or (canon_alias == "rice" and "rice" in p_name)
                or (canon_alias == "sugar" and "sugar" in p_name)
                or (canon_alias == "oil" and "oil" in p_name)
                or (canon_alias == "toor_dal" and ("toor" in p_name or "dal" in p_name))
                or (canon_alias == "atta" and "atta" in p_name)
            ):
                matched_products.append(p)

    # Trigram / fuzzy fallback if no exact alias match
    if not matched_products:
        all_product_names = [p["name"] for p in visible_products]
        close = difflib.get_close_matches(prod_phrase, all_product_names, n=2, cutoff=0.5)
        for c in close:
            for p in visible_products:
                if p["name"] == c:
                    matched_products.append(p)

    # 1. Unmatched
    if not matched_products:
        return {
            "heard": heard_text,
            "status": "unmatched",
            "question": f'I couldn\'t find "{segment.product_phrase}". Try another name, or look in the shop.',
        }

    # 2. Ambiguous between multiple products (e.g. Rice at Lakeview)
    if len(matched_products) > 1:
        options = []
        for p in matched_products:
            for v in p["variants"]:
                options.append({
                    "product_id": p["product_id"],
                    "variant_id": v["variant_id"],
                    "name": p["name"],
                    "variant_label": v["label"],
                    "quantity": 1,
                })
        first_word = prod_phrase.capitalize() if prod_phrase else "product"
        return {
            "heard": heard_text,
            "status": "ambiguous",
            "question": f"Which {prod_phrase} would you like?",
            "options": options,
        }

    # Exactly one product matched
    prod = matched_products[0]

    # Validate quantity
    if segment.quantity is None:
        return {
            "heard": heard_text,
            "status": "ambiguous",
            "question": f"How much {prod['name']} would you like?",
            "options": [
                {
                    "product_id": prod["product_id"],
                    "variant_id": v["variant_id"],
                    "name": prod["name"],
                    "variant_label": v["label"],
                    "quantity": 1,
                }
                for v in prod["variants"]
            ],
        }

    # Validate unit
    # Compute spoken base units
    spoken_dim = "weight"
    mult = 1.0
    if segment.unit:
        u_info = UNITS_TABLE.get(segment.unit.lower())
        if u_info:
            canon_u, mult = u_info
            if canon_u in ("kg", "g"):
                spoken_dim = "weight"
            elif canon_u in ("L", "ml"):
                spoken_dim = "volume"
            else:
                spoken_dim = "count"

    # If spoken unit is count ("packet", "pack", "piece"), select the primary/base pack variant
    if spoken_dim == "count":
        # Match standard base pack (e.g. 1kg or smallest pack)
        sorted_vars = sorted(prod["variants"], key=lambda v: v.get("base_units", 0))
        target_var = sorted_vars[0]
        qty = int(segment.quantity) if segment.quantity else 1
        return {
            "heard": heard_text,
            "status": "matched",
            "confidence": "high",
            "product_id": prod["product_id"],
            "variant_id": target_var["variant_id"],
            "name": prod["name"],
            "variant_label": target_var["label"],
            "quantity": qty,
        }

    # Check if unit fits the product dimension (e.g. "2 litres of rice" does not fit)
    prod_dim = prod["variants"][0]["dimension"]
    if segment.unit and spoken_dim != prod_dim:
        return {
            "heard": heard_text,
            "status": "ambiguous",
            "question": f"{prod['name']} comes in {prod_dim}. Did you mean {segment.quantity} {prod['variants'][0]['label']}?",
            "options": [
                {
                    "product_id": prod["product_id"],
                    "variant_id": v["variant_id"],
                    "name": prod["name"],
                    "variant_label": v["label"],
                    "quantity": int(segment.quantity),
                }
                for v in prod["variants"]
            ],
        }

    spoken_base_amount = segment.quantity * mult

    # Apply F3 Variant Rule:
    # 1. A listed variant whose pack equals the amount -> quantity 1.
    for v in prod["variants"]:
        if abs(v["base_units"] - spoken_base_amount) < 0.01:
            return {
                "heard": heard_text,
                "status": "matched",
                "confidence": "high",
                "product_id": prod["product_id"],
                "variant_id": v["variant_id"],
                "name": prod["name"],
                "variant_label": v["label"],
                "quantity": 1,
            }

    # 2. Otherwise the largest listed variant whose pack divides the amount exactly -> quantity n (at most 20).
    dividing_variants = []
    for v in prod["variants"]:
        pack_size = v["base_units"]
        if pack_size > 0 and (spoken_base_amount % pack_size == 0):
            n = int(spoken_base_amount // pack_size)
            if 1 <= n <= 20:
                dividing_variants.append((pack_size, n, v))

    if dividing_variants:
        # Sort by pack_size descending to pick largest
        dividing_variants.sort(key=lambda x: x[0], reverse=True)
        best_pack, n, best_v = dividing_variants[0]
        return {
            "heard": heard_text,
            "status": "matched",
            "confidence": "high",
            "product_id": prod["product_id"],
            "variant_id": best_v["variant_id"],
            "name": prod["name"],
            "variant_label": best_v["label"],
            "quantity": n,
        }

    # 3. Otherwise ambiguous, offering the nearest pack options
    options = [
        {
            "product_id": prod["product_id"],
            "variant_id": v["variant_id"],
            "name": prod["name"],
            "variant_label": v["label"],
            "quantity": max(1, round(spoken_base_amount / v["base_units"])),
        }
        for v in prod["variants"]
    ]
    return {
        "heard": heard_text,
        "status": "ambiguous",
        "question": f"No pack divides {segment.quantity} {segment.unit or ''} exactly. Which pack would you like?",
        "options": options,
    }
