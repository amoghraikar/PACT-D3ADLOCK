# Normalisation data tables for F3 Voice Interpretation Engine
# Kept strictly as data, not code.

NUMBERS_TABLE: dict[str, float] = {
    # English words
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
    # Hindi Latin (Hinglish)
    "ek": 1, "do": 2, "teen": 3, "chaar": 4, "char": 4,
    "paanch": 5, "panch": 5, "chhe": 6, "che": 6, "chheh": 6,
    "saat": 7, "aath": 8, "ath": 8, "nau": 9, "das": 10,
    # Devanagari Hindi
    "शून्य": 0, "एक": 1, "दो": 2, "तीन": 3, "चार": 4,
    "पाँच": 5, "पांच": 5, "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    # Devanagari digits
    "०": 0, "१": 1, "२": 2, "३": 3, "४": 4,
    "५": 5, "६": 6, "७": 7, "८": 8, "९": 9,
}

FRACTIONS_TABLE: dict[str, float] = {
    "half": 0.5,
    "aadha": 0.5,
    "adha": 0.5,
    "आधा": 0.5,
    "quarter": 0.25,
    "paav": 0.25,
    "pav": 0.25,
    "पाव": 0.25,
    "one and a half": 1.5,
    "dedh": 1.5,
    "डेढ़": 1.5,
    "two and a half": 2.5,
    "dhai": 2.5,
    "ढाई": 2.5,
}

UNITS_TABLE: dict[str, tuple[str, float]] = {
    # Unit alias -> (canonical_unit, base_multiplier)
    # Weight (base = grams)
    "kg": ("kg", 1000.0),
    "kilo": ("kg", 1000.0),
    "kilos": ("kg", 1000.0),
    "kilogram": ("kg", 1000.0),
    "kilograms": ("kg", 1000.0),
    "किलो": ("kg", 1000.0),
    "किलोग्राम": ("kg", 1000.0),
    "g": ("g", 1.0),
    "gm": ("g", 1.0),
    "gms": ("g", 1.0),
    "gram": ("g", 1.0),
    "grams": ("g", 1.0),
    "ग्राम": ("g", 1.0),
    # Volume (base = ml)
    "l": ("L", 1000.0),
    "lt": ("L", 1000.0),
    "ltr": ("L", 1000.0),
    "litre": ("L", 1000.0),
    "liter": ("L", 1000.0),
    "litres": ("L", 1000.0),
    "liters": ("L", 1000.0),
    "लीटर": ("L", 1000.0),
    "ml": ("ml", 1.0),
    "milli": ("ml", 1.0),
    "milliliter": ("ml", 1.0),
    "millilitre": ("ml", 1.0),
    "मिलीलीटर": ("ml", 1.0),
    # Units / Packets
    "packet": ("pack", 1.0),
    "packets": ("pack", 1.0),
    "pack": ("pack", 1.0),
    "packs": ("pack", 1.0),
    "piece": ("pack", 1.0),
    "pieces": ("pack", 1.0),
    "पैकेट": ("pack", 1.0),
    "पैक": ("pack", 1.0),
}

JOINERS: list[str] = [
    " and ",
    " aur ",
    " और ",
    " plus ",
    " also ",
    ", ",
    ",",
    "\n",
]

FILLERS_TO_DROP: list[str] = [
    "i need",
    "please add",
    "please give me",
    "please bring",
    "mujhe chahiye",
    "hume chahiye",
    "chahiye",
    "de do",
    "dedo",
    "daal do",
    "bhej do",
    "add",
    "give me",
    "kripya",
    "कृपया",
    "मुझे चाहिए",
    "चाहिए",
    "दे दो",
]

PRODUCT_ALIASES: dict[str, str] = {
    # Rice
    "rice": "rice",
    "chawal": "rice",
    "चावल": "rice",
    "sona masoori": "sona_masoori_rice",
    "sona masoori rice": "sona_masoori_rice",
    "basmati": "basmati_rice",
    "basmati rice": "basmati_rice",
    "kolam": "kolam_rice",
    "kolam rice": "kolam_rice",
    # Sugar
    "sugar": "sugar",
    "cheeni": "sugar",
    "chini": "sugar",
    "चीनी": "sugar",
    "shakkar": "sugar",
    "crystal sugar": "sugar",
    # Cooking Oil
    "sunflower oil": "sunflower_oil",
    "oil": "oil",
    "cooking oil": "oil",
    "tel": "oil",
    "तेल": "oil",
    "mustard oil": "mustard_oil",
    "sarson tel": "mustard_oil",
    "sarson ka tel": "mustard_oil",
    # Dal & Pulses
    "toor dal": "toor_dal",
    "tuvar dal": "toor_dal",
    "arhar dal": "toor_dal",
    "arhar": "toor_dal",
    "tur dal": "toor_dal",
    "toor": "toor_dal",
    "dal": "toor_dal",
    "दाल": "toor_dal",
    "तूर दाल": "toor_dal",
    "अरहर दाल": "toor_dal",
    "moong dal": "moong_dal",
    "urad dal": "urad_dal",
    "chana dal": "chana_dal",
    # Atta & Flour
    "atta": "atta",
    "aata": "atta",
    "आटा": "atta",
    "wheat flour": "atta",
    "chakki atta": "atta",
    "gehu atta": "atta",
    "maida": "maida",
    "besan": "besan",
    # Salt
    "salt": "salt",
    "namak": "namak",
    "नमक": "namak",
    # Tea
    "tea": "tea",
    "chai": "tea",
    "चाय": "tea",
    "chai patti": "tea",
}
