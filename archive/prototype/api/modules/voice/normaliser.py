import re
from app.modules.voice.tables import (
    FILLERS_TO_DROP,
    FRACTIONS_TABLE,
    NUMBERS_TABLE,
    UNITS_TABLE,
)


def normalise(text: str, language: str = "en") -> str:
    """
    Normalises speech transcript:
    1. Lowers case.
    2. Drops polite fillers and demand prefixes/suffixes ('please add', 'mujhe chahiye', 'de do').
    3. Replaces Devanagari digits with Arabic digits.
    4. Converts fractions ('aadha' -> '0.5', 'half' -> '0.5').
    5. Converts word numbers ('five' -> '5', 'paanch' -> '5', 'दो' -> '2').
    """
    res = text.lower().strip()

    # Drop fillers
    for filler in sorted(FILLERS_TO_DROP, key=lambda x: len(x), reverse=True):
        pattern = re.compile(rf"(?:^|\s){re.escape(filler)}(?:\s|$)", re.IGNORECASE)
        res = pattern.sub(" ", res)

    # Fractions normalisation
    for word, val in sorted(FRACTIONS_TABLE.items(), key=lambda x: len(x[0]), reverse=True):
        pattern = re.compile(rf"(^|\s){re.escape(word)}(\s|$)", re.IGNORECASE)
        res = pattern.sub(rf"\g<1>{val}\g<2>", res)

    # Number words normalisation
    # Sort keys by length descending to match multi-word or longer numbers first
    sorted_num_words = sorted(NUMBERS_TABLE.keys(), key=lambda x: len(x), reverse=True)
    for word in sorted_num_words:
        val = int(NUMBERS_TABLE[word])
        # Use regex boundary matching
        pattern = re.compile(rf"(^|\s){re.escape(word)}(\s|$)", re.IGNORECASE)
        res = pattern.sub(rf"\g<1>{val}\g<2>", res)

    # Clean double spaces
    res = re.sub(r"\s+", " ", res).strip()
    return res
