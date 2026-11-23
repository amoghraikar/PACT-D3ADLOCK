import re
from typing import Any
from app.modules.voice.normaliser import normalise
from app.modules.voice.tables import JOINERS, UNITS_TABLE


class ParsedSegment:
    def __init__(
        self,
        raw_segment: str,
        quantity: float | None = None,
        unit: str | None = None,
        product_phrase: str = "",
    ):
        self.raw_segment = raw_segment
        self.quantity = quantity
        self.unit = unit
        self.product_phrase = product_phrase

    def to_dict(self) -> dict[str, Any]:
        return {
            "heard": self.raw_segment,
            "quantity": self.quantity,
            "unit": self.unit,
            "product_phrase": self.product_phrase,
        }


def parse_segments(text: str, language: str = "en") -> list[ParsedSegment]:
    """
    Parses speech text into individual grocery requirement segments.
    1. Splits by joiners (and, aur, और, commas, etc.).
    2. In each segment, extracts quantity, unit, and product name.
    """
    normalised_text = normalise(text, language)

    # Build regex to split on any joiner
    split_pattern = "|".join(re.escape(j) for j in JOINERS)
    raw_pieces = re.split(split_pattern, normalised_text, flags=re.IGNORECASE)

    segments: list[ParsedSegment] = []

    # Sort units by length descending so 'kilogram' matches before 'kg'
    sorted_units = sorted(UNITS_TABLE.keys(), key=lambda x: len(x), reverse=True)
    unit_regex_str = r"|".join(re.escape(u) for u in sorted_units)

    # Patterns to match:
    # 1. Number + Unit + Product (e.g. '5 kg rice', '5kg rice', '2 L oil')
    # 2. Number + Product (e.g. '2 biscuits', '1 oil')
    # 3. Product without quantity (e.g. 'some biscuits', 'rice')

    num_unit_pattern = re.compile(
        rf"^\s*(\d+(?:\.\d+)?)\s*({unit_regex_str})\s+(?:of\s+)?(.+)$",
        re.IGNORECASE,
    )

    num_only_pattern = re.compile(
        r"^\s*(\d+(?:\.\d+)?)\s+(?:packets?\s+of\s+|packs?\s+of\s+|of\s+)?(.+)$",
        re.IGNORECASE,
    )

    for piece in raw_pieces:
        clean_piece = piece.strip()
        # Clean leading joiners / connectives left over from splitting
        clean_piece = re.sub(
            r"^(?:and|aur|और|plus|also|,|\s)+\b", "", clean_piece, flags=re.IGNORECASE
        ).strip()
        if not clean_piece:
            continue

        # Try Number + Unit + Product
        m1 = num_unit_pattern.match(clean_piece)
        if m1:
            qty_val = float(m1.group(1))
            qty = int(qty_val) if qty_val.is_integer() else qty_val
            unit_str = m1.group(2).lower()
            canon_unit, _ = UNITS_TABLE[unit_str]
            prod = m1.group(3).strip()
            # Clean leading 'of'
            prod = re.sub(r"^of\s+", "", prod).strip()
            segments.append(ParsedSegment(clean_piece, qty, canon_unit, prod))
            continue

        # Try Number + Product (no explicit unit)
        m2 = num_only_pattern.match(clean_piece)
        if m2:
            qty_val = float(m2.group(1))
            qty = int(qty_val) if qty_val.is_integer() else qty_val
            prod = m2.group(2).strip()
            prod = re.sub(r"^of\s+", "", prod).strip()
            segments.append(ParsedSegment(clean_piece, qty, None, prod))
            continue

        # No quantity/unit found (e.g. 'some biscuits', 'rice')
        # Clean 'some', 'a bit of', etc.
        prod = re.sub(r"^(?:some|thoda|thodi|kuch|ek do)\s+", "", clean_piece, flags=re.IGNORECASE).strip()
        segments.append(ParsedSegment(clean_piece, None, None, prod))

    return segments
