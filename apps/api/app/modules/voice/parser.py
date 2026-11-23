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


def parse_segments(text: str, language: str = "en-IN") -> list[ParsedSegment]:
    """
    Parses speech text into individual grocery requirement segments.
    1. Normalises speech transcript (numbers, fractions, fillers, Devanagari numerals).
    2. Splits by natural joiners ('and', 'aur', 'और', commas, etc.).
    3. For each segment, extracts quantity, measurement unit, and product name.
    Supports both '<qty> <unit> <product>' and colloquial Hindi '<product> <qty> <unit>'.
    """
    normalised_text = normalise(text, language)
    if not normalised_text:
        return []

    # Build regex to split on any joiner
    split_pattern = "|".join(re.escape(j) for j in JOINERS)
    raw_pieces = re.split(split_pattern, normalised_text, flags=re.IGNORECASE)

    segments: list[ParsedSegment] = []

    # Sort units by length descending so 'kilogram' matches before 'kg'
    sorted_units = sorted(UNITS_TABLE.keys(), key=lambda x: len(x), reverse=True)
    unit_regex_str = r"|".join(re.escape(u) for u in sorted_units)

    # Regex patterns:
    # 1. Standard: <qty> <unit> [of] <product> (e.g. '2 kg sona masoori rice', '2kg rice', '1 litre amul doodh')
    pattern_qty_unit_prod = re.compile(
        rf"^\s*(\d+(?:\.\d+)?)\s*({unit_regex_str})\s+(?:of\s+)?(.+)$",
        re.IGNORECASE,
    )

    # 2. Hindi inverted: <product> <qty> <unit> (e.g. 'sona masoori rice 2 kg', 'chawal 2 kilo', 'amul doodh 1 litre')
    pattern_prod_qty_unit = re.compile(
        rf"^(.+?)\s+(\d+(?:\.\d+)?)\s*({unit_regex_str})\s*$",
        re.IGNORECASE,
    )

    # 3. Quantity without explicit unit: <qty> [packs/packets/bottles of] <product> (e.g. '2 parle g', '1 maggi', '2 packets of biscuits')
    pattern_qty_prod = re.compile(
        r"^\s*(\d+(?:\.\d+)?)\s+(?:(?:packets?|packs?|pieces?|bottles?|boxes?)\s+of\s+|of\s+)?(.+)$",
        re.IGNORECASE,
    )

    # 4. Hindi inverted quantity without unit: <product> <qty> (e.g. 'parle g 2', 'maggi 3')
    pattern_prod_qty = re.compile(
        r"^(.+?)\s+(\d+(?:\.\d+)?)\s*$",
        re.IGNORECASE,
    )

    for piece in raw_pieces:
        clean_piece = piece.strip()
        # Clean leading joiners / connectives left over from splitting
        clean_piece = re.sub(
            r"^(?:and|aur|और|plus|also|va|व|tatha|तथा|,|\s)+\b", "", clean_piece, flags=re.IGNORECASE
        ).strip()
        if not clean_piece:
            continue

        # Pattern 1: <qty> <unit> <product>
        m1 = pattern_qty_unit_prod.match(clean_piece)
        if m1:
            qty_val = float(m1.group(1))
            qty = int(qty_val) if qty_val.is_integer() else qty_val
            unit_raw = m1.group(2).lower()
            canon_unit = UNITS_TABLE[unit_raw][0]
            prod = m1.group(3).strip()
            prod = re.sub(r"^of\s+", "", prod, flags=re.IGNORECASE).strip()
            segments.append(ParsedSegment(clean_piece, qty, canon_unit, prod))
            continue

        # Pattern 2: <product> <qty> <unit>
        m2 = pattern_prod_qty_unit.match(clean_piece)
        if m2:
            prod = m2.group(1).strip()
            qty_val = float(m2.group(2))
            qty = int(qty_val) if qty_val.is_integer() else qty_val
            unit_raw = m2.group(3).lower()
            canon_unit = UNITS_TABLE[unit_raw][0]
            segments.append(ParsedSegment(clean_piece, qty, canon_unit, prod))
            continue

        # Pattern 3: <qty> <product>
        m3 = pattern_qty_prod.match(clean_piece)
        if m3:
            qty_val = float(m3.group(1))
            qty = int(qty_val) if qty_val.is_integer() else qty_val
            prod = m3.group(2).strip()
            prod = re.sub(r"^of\s+", "", prod, flags=re.IGNORECASE).strip()
            segments.append(ParsedSegment(clean_piece, qty, None, prod))
            continue

        # Pattern 4: <product> <qty>
        m4 = pattern_prod_qty.match(clean_piece)
        if m4:
            prod = m4.group(1).strip()
            qty_val = float(m4.group(2))
            qty = int(qty_val) if qty_val.is_integer() else qty_val
            segments.append(ParsedSegment(clean_piece, qty, None, prod))
            continue

        # Pattern 5: Product without explicit quantity
        # Clean 'some', 'thoda', 'kuch' prefixes
        prod = re.sub(
            r"^(?:some|thoda|thodi|kuch|ek do|a bit of|थोड़ा|थोड़ी|कुछ)\s+",
            "",
            clean_piece,
            flags=re.IGNORECASE,
        ).strip()
        segments.append(ParsedSegment(clean_piece, 1.0, None, prod))

    return segments
