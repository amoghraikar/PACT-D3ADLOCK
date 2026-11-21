import pytest
from fastapi.testclient import TestClient

from app.core.security import create_session_token
from app.main import app
from app.modules.catalogue.router import PRODUCTS, RETAILER_LISTINGS


@pytest.fixture(autouse=True)
def setup_catalogue():
    # Setup Sri Lakshmi Stores listings (Ravi) for Green Meadows
    # Rice: ONLY Sona Masoori Rice (variants: 5 kg, 1 kg)
    RETAILER_LISTINGS[("ret-ravi-1", "var-rice-sona-5kg")] = {"selling_price_paise": 30000, "mrp_paise": 34000, "availability": "active"}
    RETAILER_LISTINGS[("ret-ravi-1", "var-rice-sona-1kg")] = {"selling_price_paise": 6500, "mrp_paise": 7500, "availability": "active"}
    # Sugar: 1 kg
    RETAILER_LISTINGS[("ret-ravi-1", "var-sugar-madhur-1kg")] = {"selling_price_paise": 6000, "mrp_paise": 7000, "availability": "active"}
    # Sunflower Oil: 1 L
    RETAILER_LISTINGS[("ret-ravi-1", "var-oil-sunflower-1l")] = {"selling_price_paise": 14000, "mrp_paise": 16000, "availability": "active"}
    # Toor Dal: 1 kg, 500 g
    RETAILER_LISTINGS[("ret-ravi-1", "var-dal-toor-1kg")] = {"selling_price_paise": 18000, "mrp_paise": 20000, "availability": "active"}
    RETAILER_LISTINGS[("ret-ravi-1", "var-dal-toor-500g")] = {"selling_price_paise": 9500, "mrp_paise": 11000, "availability": "active"}

    # Setup Daily Needs Mart listings (Farah) for Lakeview
    # Rice: lists BOTH Sona Masoori Rice AND Basmati Rice!
    RETAILER_LISTINGS[("ret-farah-2", "var-rice-sona-5kg")] = {"selling_price_paise": 32000, "mrp_paise": 35000, "availability": "active"}
    RETAILER_LISTINGS[("ret-farah-2", "var-rice-basmati-5kg")] = {"selling_price_paise": 55000, "mrp_paise": 60000, "availability": "active"}
    RETAILER_LISTINGS[("ret-farah-2", "var-sugar-madhur-1kg")] = {"selling_price_paise": 6000, "mrp_paise": 7000, "availability": "active"}
    RETAILER_LISTINGS[("ret-farah-2", "var-oil-sunflower-1l")] = {"selling_price_paise": 14000, "mrp_paise": 16000, "availability": "active"}
    RETAILER_LISTINGS[("ret-farah-2", "var-dal-toor-500g")] = {"selling_price_paise": 9500, "mrp_paise": 11000, "availability": "active"}


def test_asha_scenario_g_sentence():
    """
    P20: Asha's G sentence → rice 5 kg × 1, sugar 1 kg × 2, sunflower oil 1 L × 1, toor dal 500 g × 1, all matched.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    phrase = "5 kg rice, 2 kg sugar, 1 L sunflower oil, and 500 g toor dal"
    res = client.post(
        "/api/v1/voice/interpret",
        headers={"Authorization": f"Bearer {token_asha}"},
        json={"text": phrase, "language": "en"},
    )
    assert res.status_code == 200
    data = res.json()
    items = data["items"]
    assert len(items) == 4

    # 1. Rice 5 kg x 1
    assert items[0]["status"] == "matched"
    assert "Rice" in items[0]["name"]
    assert items[0]["variant_label"] == "5 kg"
    assert items[0]["quantity"] == 1

    # 2. Sugar 1 kg x 2
    assert items[1]["status"] == "matched"
    assert "Sugar" in items[1]["name"]
    assert items[1]["variant_label"] == "1 kg"
    assert items[1]["quantity"] == 2

    # 3. Sunflower oil 1 L x 1
    assert items[2]["status"] == "matched"
    assert "Oil" in items[2]["name"]
    assert items[2]["variant_label"] == "1 L"
    assert items[2]["quantity"] == 1

    # 4. Toor dal 500 g x 1
    assert items[3]["status"] == "matched"
    assert "Dal" in items[3]["name"]
    assert items[3]["variant_label"] == "500 g"
    assert items[3]["quantity"] == 1


def test_esha_at_lakeview_rice_ambiguous():
    """
    P20: The same sentence for Esha → rice is ambiguous with two options; the rest match.
    """
    client = TestClient(app)
    token_esha = create_session_token("usr-esha-5")

    phrase = "5 kg rice, 2 kg sugar, 1 L sunflower oil, and 500 g toor dal"
    res = client.post(
        "/api/v1/voice/interpret",
        headers={"Authorization": f"Bearer {token_esha}"},
        json={"text": phrase, "language": "en"},
    )
    assert res.status_code == 200
    data = res.json()
    items = data["items"]
    assert len(items) == 4

    # Rice is ambiguous between Sona Masoori and Basmati at Lakeview!
    assert items[0]["status"] == "ambiguous"
    assert len(items[0]["options"]) >= 2
    assert "Which rice would you like?" in items[0]["question"]

    # The rest match cleanly
    assert items[1]["status"] == "matched"
    assert items[2]["status"] == "matched"
    assert items[3]["status"] == "matched"


def test_hindi_devanagari_and_latin_hinglish():
    """
    P20: "पाँच किलो चावल और दो किलो चीनी" and "paanch kilo chawal aur do kilo cheeni"
    give the same result as the English.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    # Devanagari Hindi
    res_hi = client.post(
        "/api/v1/voice/interpret",
        headers={"Authorization": f"Bearer {token_asha}"},
        json={"text": "पाँच किलो चावल और दो किलो चीनी", "language": "hi"},
    )
    assert res_hi.status_code == 200
    items_hi = res_hi.json()["items"]
    assert len(items_hi) == 2
    assert items_hi[0]["status"] == "matched"
    assert items_hi[0]["quantity"] == 1  # 5kg pack
    assert items_hi[1]["status"] == "matched"
    assert items_hi[1]["quantity"] == 2  # 1kg pack x 2 = 2kg

    # Latin Hinglish
    res_hinglish = client.post(
        "/api/v1/voice/interpret",
        headers={"Authorization": f"Bearer {token_asha}"},
        json={"text": "paanch kilo chawal aur do kilo cheeni", "language": "hi"},
    )
    assert res_hinglish.status_code == 200
    items_hinglish = res_hinglish.json()["items"]
    assert len(items_hinglish) == 2
    assert items_hinglish[0]["status"] == "matched"
    assert items_hinglish[0]["quantity"] == 1
    assert items_hinglish[1]["status"] == "matched"
    assert items_hinglish[1]["quantity"] == 2


def test_edge_cases_and_clarification_questions():
    """
    P20:
    - Missing quantity
    - Unknown product
    - Unit that does not fit
    - Amount no pack divides
    -> the right status and question, never a silent guess.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    # 1. Missing quantity
    res1 = client.post(
        "/api/v1/voice/interpret",
        headers={"Authorization": f"Bearer {token_asha}"},
        json={"text": "rice", "language": "en"},
    )
    assert res1.json()["items"][0]["status"] == "ambiguous"
    assert "How much" in res1.json()["items"][0]["question"]

    # 2. Unknown product
    res2 = client.post(
        "/api/v1/voice/interpret",
        headers={"Authorization": f"Bearer {token_asha}"},
        json={"text": "some biscuits", "language": "en"},
    )
    assert res2.json()["items"][0]["status"] == "unmatched"
    assert "couldn't find" in res2.json()["items"][0]["question"]

    # 3. Unit that does not fit (2 litres of rice)
    res3 = client.post(
        "/api/v1/voice/interpret",
        headers={"Authorization": f"Bearer {token_asha}"},
        json={"text": "2 litres of rice", "language": "en"},
    )
    assert res3.json()["items"][0]["status"] == "ambiguous"
    assert "comes in weight" in res3.json()["items"][0]["question"] or "Did you mean" in res3.json()["items"][0]["question"]

    # 4. Amount no pack divides (e.g. 350g toor dal where packs are 500g and 1kg)
    res4 = client.post(
        "/api/v1/voice/interpret",
        headers={"Authorization": f"Bearer {token_asha}"},
        json={"text": "350 g toor dal", "language": "en"},
    )
    assert res4.json()["items"][0]["status"] == "ambiguous"
    assert "divides" in res4.json()["items"][0]["question"]


def test_table_driven_suite_of_40_phrases():
    """
    P20: A table-driven suite of at least 40 phrases across both languages.
    """
    client = TestClient(app)
    token_asha = create_session_token("usr-asha-1")

    test_phrases = [
        # English
        ("5 kg rice", "matched"),
        ("1 kg sugar", "matched"),
        ("2 kg sugar", "matched"),
        ("1 L sunflower oil", "matched"),
        ("500 g toor dal", "matched"),
        ("1 kg toor dal", "matched"),
        ("please add 5 kg rice", "matched"),
        ("I need 1 L oil", "matched"),
        ("5 kg rice and 1 kg sugar", "matched"),
        ("1 kg sugar plus 500 g dal", "matched"),
        ("half kg toor dal", "matched"),
        ("1000 g sugar", "matched"),
        ("5000 g rice", "matched"),
        ("1000 ml oil", "matched"),
        ("give me 5 kg rice", "matched"),
        ("5 kg rice, 1 L oil", "matched"),
        ("2 kg sugar and 1 kg toor dal", "matched"),
        ("1 packet of sugar", "matched"),
        ("2 packets of sugar", "matched"),
        ("1 kg dal", "matched"),
        # Hindi Devanagari
        ("पाँच किलो चावल", "matched"),
        ("एक किलो चीनी", "matched"),
        ("दो किलो चीनी", "matched"),
        ("एक लीटर तेल", "matched"),
        ("आधा किलो दाल", "matched"),
        ("एक किलो दाल", "matched"),
        ("मुझे चाहिए पाँच किलो चावल", "matched"),
        ("दो किलो चीनी दे दो", "matched"),
        ("पाँच किलो चावल और एक लीटर तेल", "matched"),
        ("एक किलो चीनी और आधा किलो दाल", "matched"),
        ("५ किलो चावल", "matched"),
        ("१ किलो चीनी", "matched"),
        ("२ किलो चीनी", "matched"),
        ("१ लीटर तेल", "matched"),
        # Hinglish Latin
        ("paanch kilo chawal", "matched"),
        ("ek kilo cheeni", "matched"),
        ("do kilo cheeni", "matched"),
        ("ek litre tel", "matched"),
        ("aadha kilo toor dal", "matched"),
        ("mujhe chahiye ek litre sunflower oil", "matched"),
        ("do kilo cheeni aur ek kilo dal", "matched"),
        ("paanch kilo rice aur do kilo sugar", "matched"),
    ]

    assert len(test_phrases) >= 40

    for phrase, expected_status in test_phrases:
        res = client.post(
            "/api/v1/voice/interpret",
            headers={"Authorization": f"Bearer {token_asha}"},
            json={"text": phrase, "language": "hi" if any(ord(c) > 128 for c in phrase) else "en"},
        )
        assert res.status_code == 200, f"Failed for phrase: {phrase}"
        items = res.json()["items"]
        assert len(items) >= 1, f"No items parsed for: {phrase}"
        for item in items:
            assert item["status"] == expected_status, f"Expected {expected_status} but got {item['status']} for phrase '{phrase}' (heard: {item.get('heard')})"
