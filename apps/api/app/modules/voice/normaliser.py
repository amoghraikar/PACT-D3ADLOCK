import re

from app.modules.voice.tables import (
    FILLERS_TO_DROP,
    FRACTIONS_TABLE,
    NUMBERS_TABLE,
)

DEVANAGARI_DIGITS = {
    "०": "0",
    "१": "1",
    "२": "2",
    "३": "3",
    "४": "4",
    "५": "5",
    "६": "6",
    "७": "7",
    "८": "8",
    "९": "9",
}


def normalise(text: str, language: str = "en-IN") -> str:
    """
    Normalises multilingual speech transcript:
    1. Lowercases text.
    2. Drops conversational fillers and intent prefixes/suffixes.
    3. Replaces Devanagari digits with Arabic numerals (०-९ -> 0-9).
    4. Converts fraction phrases and words to decimal numbers ('aadha' -> '0.5', 'dedh' -> '1.5').
    5. Converts spoken numeral words (English, Hindi Latin, Devanagari) to Arabic digits ('do' -> '2', 'तीन' -> '3').
    6. Normalises internal whitespace.
    """
    if not text:
        return ""

    res = text.lower().strip()

    # 1. Drop fillers (longest match first)
    for filler in sorted(FILLERS_TO_DROP, key=lambda x: len(x), reverse=True):
        pattern = re.compile(rf"(?:^|\s){re.escape(filler)}(?:\s|$)", re.IGNORECASE)
        res = pattern.sub(" ", res)

    # 2. Devanagari digits to standard digits
    for dev_char, std_digit in DEVANAGARI_DIGITS.items():
        res = res.replace(dev_char, std_digit)

    # 3. Fractions normalisation (e.g. 'one and a half', 'sadhe teen', 'dedh', 'aadha', 'आधा')
    for phrase, val in sorted(FRACTIONS_TABLE.items(), key=lambda x: len(x[0]), reverse=True):
        pattern = re.compile(rf"(?:^|(?<=\s)){re.escape(phrase)}(?=\s|$)", re.IGNORECASE)
        res = pattern.sub(str(val), res)

    # 4. Spoken number words normalisation
    # Sort keys by length descending to match multi-word numbers first ('twenty five' before 'five')
    sorted_num_words = sorted(NUMBERS_TABLE.keys(), key=lambda x: len(x), reverse=True)
    for word in sorted_num_words:
        val = NUMBERS_TABLE[word]
        val_str = str(int(val)) if val.is_integer() else str(val)
        pattern = re.compile(rf"(?:^|(?<=\s)){re.escape(word)}(?=\s|$)", re.IGNORECASE)
        res = pattern.sub(val_str, res)

    # 5. Clean up multiple whitespaces
    res = re.sub(r"\s+", " ", res).strip()
    return res
