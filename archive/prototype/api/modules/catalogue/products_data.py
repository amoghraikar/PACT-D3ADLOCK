"""
Catalogue and Retailer Listings for PACT
Contains 60+ realistic grocery products across all 12 categories with full variant & stock specifications.
"""

from typing import Any

EXPANDED_PRODUCTS: list[dict[str, Any]] = [
    # ----------------------------------------------------
    # 1. Rice & Grains (cat-1)
    # ----------------------------------------------------
    {
        "id": "prod-rice-sona",
        "category_id": "cat-1",
        "category_name": "Rice & Grains",
        "name": "Sona Masoori Rice",
        "brand": "Standard Groceries",
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
        "aliases": ["rice", "chawal", "चावल", "sona masoori", "raw rice"],
        "variants": [
            {"id": "var-rice-sona-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
            {"id": "var-rice-sona-5kg", "label": "5 kg", "pack_size": 5, "pack_unit": "kg", "base_qty": 5000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-rice-basmati",
        "category_id": "cat-1",
        "category_name": "Rice & Grains",
        "name": "Royal Basmati Rice",
        "brand": "Heritage",
        "image_url": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&auto=format&fit=crop&q=80",
        "aliases": ["rice", "chawal", "चावल", "basmati", "biryani rice"],
        "variants": [
            {"id": "var-rice-basmati-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
            {"id": "var-rice-basmati-5kg", "label": "5 kg", "pack_size": 5, "pack_unit": "kg", "base_qty": 5000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-rice-kolam",
        "category_id": "cat-1",
        "category_name": "Rice & Grains",
        "name": "Wada Kolam Rice",
        "brand": "Daily Kitchen",
        "image_url": "https://images.unsplash.com/photo-1596797882870-8c33deeac224?w=400&auto=format&fit=crop&q=80",
        "aliases": ["kolam rice", "kolam", "wada kolam"],
        "variants": [
            {"id": "var-rice-kolam-5kg", "label": "5 kg", "pack_size": 5, "pack_unit": "kg", "base_qty": 5000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-grain-poha",
        "category_id": "cat-1",
        "category_name": "Rice & Grains",
        "name": "Thick Poha (Flattened Rice)",
        "brand": "Pure Harvest",
        "image_url": "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?w=400&auto=format&fit=crop&q=80",
        "aliases": ["poha", "avalakki", "chivda", "पोहा"],
        "variants": [
            {"id": "var-poha-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-grain-dalia",
        "category_id": "cat-1",
        "category_name": "Rice & Grains",
        "name": "Wheat Dalia (Cracked Wheat)",
        "brand": "Nature Best",
        "image_url": "https://images.unsplash.com/photo-1574316071802-0d684efa7cd5?w=400&auto=format&fit=crop&q=80",
        "aliases": ["dalia", "broken wheat", "दलिया"],
        "variants": [
            {"id": "var-dalia-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-grain-idli-rice",
        "category_id": "cat-1",
        "category_name": "Rice & Grains",
        "name": "Parboiled Idli Rice",
        "brand": "Standard Groceries",
        "image_url": "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&auto=format&fit=crop&q=80",
        "aliases": ["idli rice", "parboiled rice", "dosa rice"],
        "variants": [
            {"id": "var-idli-rice-5kg", "label": "5 kg", "pack_size": 5, "pack_unit": "kg", "base_qty": 5000, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 2. Flours & Atta (cat-2)
    # ----------------------------------------------------
    {
        "id": "prod-flour-atta",
        "category_id": "cat-2",
        "category_name": "Flours & Atta",
        "name": "Whole Wheat Chakki Atta",
        "brand": "Harvest Gold",
        "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
        "aliases": ["atta", "flour", "gehu", "आटा", "wheat flour"],
        "variants": [
            {"id": "var-atta-5kg", "label": "5 kg", "pack_size": 5, "pack_unit": "kg", "base_qty": 5000, "base_unit": "g"},
            {"id": "var-atta-10kg", "label": "10 kg", "pack_size": 10, "pack_unit": "kg", "base_qty": 10000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-flour-maida",
        "category_id": "cat-2",
        "category_name": "Flours & Atta",
        "name": "Refined Wheat Maida",
        "brand": "Harvest Gold",
        "image_url": "https://images.unsplash.com/photo-1627485937980-221c88ac04f9?w=400&auto=format&fit=crop&q=80",
        "aliases": ["maida", "all purpose flour", "मैदा"],
        "variants": [
            {"id": "var-maida-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-flour-besan",
        "category_id": "cat-2",
        "category_name": "Flours & Atta",
        "name": "Pure Gram Besan",
        "brand": "Golden Harvest",
        "image_url": "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&auto=format&fit=crop&q=80",
        "aliases": ["besan", "gram flour", "chana flour", "बेसन"],
        "variants": [
            {"id": "var-besan-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
            {"id": "var-besan-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-flour-sooji",
        "category_id": "cat-2",
        "category_name": "Flours & Atta",
        "name": "Roasted Sooji / Rava",
        "brand": "Daily Kitchen",
        "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80",
        "aliases": ["sooji", "suji", "rava", "semolina", "सूजी"],
        "variants": [
            {"id": "var-sooji-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-flour-ragi",
        "category_id": "cat-2",
        "category_name": "Flours & Atta",
        "name": "Organic Ragi Flour",
        "brand": "Pure Harvest",
        "image_url": "https://images.unsplash.com/photo-1606851094655-b2593a9af63f?w=400&auto=format&fit=crop&q=80",
        "aliases": ["ragi flour", "finger millet flour", "nachni flour", "रागी"],
        "variants": [
            {"id": "var-ragi-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 3. Dal & Pulses (cat-3)
    # ----------------------------------------------------
    {
        "id": "prod-dal-toor",
        "category_id": "cat-3",
        "category_name": "Dal (Lentils) & Pulses",
        "name": "Toor Dal",
        "brand": "Golden Pulses",
        "image_url": "https://images.unsplash.com/photo-1585994192701-f1a505c8574a?w=400&auto=format&fit=crop&q=80",
        "aliases": ["toor dal", "arhar", "दाल", "dal", "tuvar dal"],
        "variants": [
            {"id": "var-dal-toor-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
            {"id": "var-dal-toor-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-dal-moong-yellow",
        "category_id": "cat-3",
        "category_name": "Dal (Lentils) & Pulses",
        "name": "Moong Dal Yellow Split",
        "brand": "Golden Pulses",
        "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80",
        "aliases": ["moong dal", "yellow dal", "धुली मूंग दाल"],
        "variants": [
            {"id": "var-moong-yellow-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
            {"id": "var-moong-yellow-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-dal-chana",
        "category_id": "cat-3",
        "category_name": "Dal (Lentils) & Pulses",
        "name": "Chana Dal",
        "brand": "Golden Pulses",
        "image_url": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400&auto=format&fit=crop&q=80",
        "aliases": ["chana dal", "bengal gram dal", "चना दाल"],
        "variants": [
            {"id": "var-chana-dal-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-dal-urad-white",
        "category_id": "cat-3",
        "category_name": "Dal (Lentils) & Pulses",
        "name": "Urad Dal Gota (Whole White)",
        "brand": "Heritage",
        "image_url": "https://images.unsplash.com/photo-1585994192701-f1a505c8574a?w=400&auto=format&fit=crop&q=80",
        "aliases": ["urad dal", "white urad", "idli dal", "उड़द दाल"],
        "variants": [
            {"id": "var-urad-white-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-pulse-rajma",
        "category_id": "cat-3",
        "category_name": "Dal (Lentils) & Pulses",
        "name": "Kashmiri Red Rajma",
        "brand": "Nature Best",
        "image_url": "https://images.unsplash.com/photo-1585994192701-f1a505c8574a?w=400&auto=format&fit=crop&q=80",
        "aliases": ["rajma", "kidney beans", "राजमा"],
        "variants": [
            {"id": "var-rajma-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-pulse-kabuli-chana",
        "category_id": "cat-3",
        "category_name": "Dal (Lentils) & Pulses",
        "name": "Kabuli Chana (White Chickpeas)",
        "brand": "Nature Best",
        "image_url": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400&auto=format&fit=crop&q=80",
        "aliases": ["chole", "kabuli chana", "chickpeas", "छोले"],
        "variants": [
            {"id": "var-kabuli-chana-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 4. Spices (cat-4)
    # ----------------------------------------------------
    {
        "id": "prod-spice-turmeric",
        "category_id": "cat-4",
        "category_name": "Spices",
        "name": "Pure Turmeric Powder (Haldi)",
        "brand": "Spice Craft",
        "image_url": "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&auto=format&fit=crop&q=80",
        "aliases": ["haldi", "turmeric", "हल्दी"],
        "variants": [
            {"id": "var-turmeric-200g", "label": "200 g", "pack_size": 200, "pack_unit": "g", "base_qty": 200, "base_unit": "g"},
            {"id": "var-turmeric-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-spice-chilli",
        "category_id": "cat-4",
        "category_name": "Spices",
        "name": "Kashmiri Red Chilli Powder",
        "brand": "Spice Craft",
        "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80",
        "aliases": ["mirchi", "chilli powder", "लाल मिर्च"],
        "variants": [
            {"id": "var-chilli-200g", "label": "200 g", "pack_size": 200, "pack_unit": "g", "base_qty": 200, "base_unit": "g"},
            {"id": "var-chilli-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-spice-coriander",
        "category_id": "cat-4",
        "category_name": "Spices",
        "name": "Dhania (Coriander) Powder",
        "brand": "Spice Craft",
        "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80",
        "aliases": ["dhania", "coriander powder", "धनिया पाउडर"],
        "variants": [
            {"id": "var-dhania-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-spice-jeera",
        "category_id": "cat-4",
        "category_name": "Spices",
        "name": "Cumin Seeds (Jeera)",
        "brand": "Spice Craft",
        "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80",
        "aliases": ["jeera", "cumin", "जीरा"],
        "variants": [
            {"id": "var-jeera-200g", "label": "200 g", "pack_size": 200, "pack_unit": "g", "base_qty": 200, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-spice-mustard",
        "category_id": "cat-4",
        "category_name": "Spices",
        "name": "Small Black Mustard Seeds (Rai)",
        "brand": "Daily Kitchen",
        "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80",
        "aliases": ["rai", "sarson", "mustard seeds", "राई"],
        "variants": [
            {"id": "var-mustard-200g", "label": "200 g", "pack_size": 200, "pack_unit": "g", "base_qty": 200, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-spice-garam-masala",
        "category_id": "cat-4",
        "category_name": "Spices",
        "name": "Shahi Garam Masala",
        "brand": "Spice Craft",
        "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80",
        "aliases": ["garam masala", "shahi masala", "गरम मसाला"],
        "variants": [
            {"id": "var-garam-masala-100g", "label": "100 g", "pack_size": 100, "pack_unit": "g", "base_qty": 100, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 5. Sugar & Jaggery (cat-5)
    # ----------------------------------------------------
    {
        "id": "prod-sugar",
        "category_id": "cat-5",
        "category_name": "Sugar & Jaggery",
        "name": "Sugar",
        "brand": "Crystal Pure",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["sugar", "cheeni", "चीनी", "shakkar", "white sugar"],
        "variants": [
            {"id": "var-sugar-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
            {"id": "var-sugar-5kg", "label": "5 kg", "pack_size": 5, "pack_unit": "kg", "base_qty": 5000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-jaggery-block",
        "category_id": "cat-5",
        "category_name": "Sugar & Jaggery",
        "name": "Organic Kolhapuri Jaggery Block",
        "brand": "Nature Best",
        "image_url": "https://images.unsplash.com/photo-1605666807892-8c11d023b12f?w=400&auto=format&fit=crop&q=80",
        "aliases": ["gur", "gud", "jaggery", "गुड़"],
        "variants": [
            {"id": "var-jaggery-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-jaggery-powder",
        "category_id": "cat-5",
        "category_name": "Sugar & Jaggery",
        "name": "Natural Desi Jaggery Powder",
        "brand": "Nature Best",
        "image_url": "https://images.unsplash.com/photo-1605666807892-8c11d023b12f?w=400&auto=format&fit=crop&q=80",
        "aliases": ["jaggery powder", "gur powder", "shakkar powder"],
        "variants": [
            {"id": "var-jaggery-powder-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 6. Cooking Oils & Ghee (cat-6)
    # ----------------------------------------------------
    {
        "id": "prod-oil-sunflower",
        "category_id": "cat-6",
        "category_name": "Cooking Oils & Ghee",
        "name": "Sunflower Oil",
        "brand": "Sun Gold",
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
        "aliases": ["oil", "sunflower oil", "tel", "तेल"],
        "variants": [
            {"id": "var-oil-sunflower-1l", "label": "1 L", "pack_size": 1, "pack_unit": "l", "base_qty": 1000, "base_unit": "ml"},
            {"id": "var-oil-sunflower-5l", "label": "5 L", "pack_size": 5, "pack_unit": "l", "base_qty": 5000, "base_unit": "ml"},
        ],
    },
    {
        "id": "prod-oil-groundnut",
        "category_id": "cat-6",
        "category_name": "Cooking Oils & Ghee",
        "name": "Filtered Groundnut (Peanut) Oil",
        "brand": "Heritage",
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
        "aliases": ["groundnut oil", "peanut oil", "moongfali tel"],
        "variants": [
            {"id": "var-oil-groundnut-1l", "label": "1 L", "pack_size": 1, "pack_unit": "l", "base_qty": 1000, "base_unit": "ml"},
            {"id": "var-oil-groundnut-5l", "label": "5 L", "pack_size": 5, "pack_unit": "l", "base_qty": 5000, "base_unit": "ml"},
        ],
    },
    {
        "id": "prod-oil-mustard",
        "category_id": "cat-6",
        "category_name": "Cooking Oils & Ghee",
        "name": "Kachi Ghani Pure Mustard Oil",
        "brand": "Sun Gold",
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
        "aliases": ["mustard oil", "sarson tel", "सरसों का तेल"],
        "variants": [
            {"id": "var-oil-mustard-1l", "label": "1 L", "pack_size": 1, "pack_unit": "l", "base_qty": 1000, "base_unit": "ml"},
        ],
    },
    {
        "id": "prod-ghee-cow",
        "category_id": "cat-6",
        "category_name": "Cooking Oils & Ghee",
        "name": "A2 Pure Desi Cow Ghee",
        "brand": "Golden Dairy",
        "image_url": "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=400&auto=format&fit=crop&q=80",
        "aliases": ["ghee", "cow ghee", "desi ghee", "घी"],
        "variants": [
            {"id": "var-ghee-cow-500ml", "label": "500 ml", "pack_size": 500, "pack_unit": "ml", "base_qty": 500, "base_unit": "ml"},
            {"id": "var-ghee-cow-1l", "label": "1 L", "pack_size": 1, "pack_unit": "l", "base_qty": 1000, "base_unit": "ml"},
        ],
    },

    # ----------------------------------------------------
    # 7. Sauces, Pickles & Spreads (cat-7)
    # ----------------------------------------------------
    {
        "id": "prod-pickle-mango",
        "category_id": "cat-7",
        "category_name": "Sauces, Pickles & Spreads",
        "name": "Avakaya Mango Pickle",
        "brand": "Mother's Recipe",
        "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80",
        "aliases": ["mango pickle", "aam ka achaar", "आम का अचार"],
        "variants": [
            {"id": "var-pickle-mango-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-sauce-ketchup",
        "category_id": "cat-7",
        "category_name": "Sauces, Pickles & Spreads",
        "name": "Rich Tomato Ketchup",
        "brand": "Daily Kitchen",
        "image_url": "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&auto=format&fit=crop&q=80",
        "aliases": ["ketchup", "tomato sauce", "सॉस"],
        "variants": [
            {"id": "var-ketchup-950g", "label": "950 g", "pack_size": 950, "pack_unit": "g", "base_qty": 950, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 8. Dry Fruits (cat-8)
    # ----------------------------------------------------
    {
        "id": "prod-dry-almond",
        "category_id": "cat-8",
        "category_name": "Dry Fruits",
        "name": "California Whole Almonds (Badam)",
        "brand": "Nutri Feast",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["badam", "almonds", "बादाम"],
        "variants": [
            {"id": "var-badam-250g", "label": "250 g", "pack_size": 250, "pack_unit": "g", "base_qty": 250, "base_unit": "g"},
            {"id": "var-badam-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-dry-cashew",
        "category_id": "cat-8",
        "category_name": "Dry Fruits",
        "name": "W240 Whole Cashews (Kaju)",
        "brand": "Nutri Feast",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["kaju", "cashews", "काजू"],
        "variants": [
            {"id": "var-kaju-250g", "label": "250 g", "pack_size": 250, "pack_unit": "g", "base_qty": 250, "base_unit": "g"},
            {"id": "var-kaju-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-dry-raisins",
        "category_id": "cat-8",
        "category_name": "Dry Fruits",
        "name": "Golden Long Raisins (Kishmish)",
        "brand": "Nutri Feast",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["kishmish", "raisins", "किशमिश"],
        "variants": [
            {"id": "var-kishmish-250g", "label": "250 g", "pack_size": 250, "pack_unit": "g", "base_qty": 250, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 9. Fruits & Nuts (cat-9)
    # ----------------------------------------------------
    {
        "id": "prod-dates-arabian",
        "category_id": "cat-9",
        "category_name": "Fruits & Nuts",
        "name": "Crown Arabian Black Dates",
        "brand": "Nutri Feast",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["dates", "khajoor", "खजूर"],
        "variants": [
            {"id": "var-dates-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 10. Beverages (cat-10)
    # ----------------------------------------------------
    {
        "id": "prod-tea-assam",
        "category_id": "cat-10",
        "category_name": "Beverages",
        "name": "Strong CTC Assam Leaf Tea",
        "brand": "Heritage",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["chai", "tea", "assam tea", "चाय"],
        "variants": [
            {"id": "var-tea-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
            {"id": "var-tea-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-coffee-filter",
        "category_id": "cat-10",
        "category_name": "Beverages",
        "name": "South Indian Filter Coffee (80:20)",
        "brand": "South Blend",
        "image_url": "/brand/pact-mark.png",
        "aliases": ["coffee", "filter coffee", "कॉफी"],
        "variants": [
            {"id": "var-coffee-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 11. Snacks (cat-11)
    # ----------------------------------------------------
    {
        "id": "prod-snack-peanuts",
        "category_id": "cat-11",
        "category_name": "Snacks",
        "name": "Salted Crunchy Roasted Peanuts",
        "brand": "Daily Kitchen",
        "image_url": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80",
        "aliases": ["peanuts", "roasted peanuts", "मूंगफली"],
        "variants": [
            {"id": "var-peanuts-200g", "label": "200 g", "pack_size": 200, "pack_unit": "g", "base_qty": 200, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-snack-makhana",
        "category_id": "cat-11",
        "category_name": "Snacks",
        "name": "Jumbo Phool Makhana (Fox Nuts)",
        "brand": "Nutri Feast",
        "image_url": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80",
        "aliases": ["makhana", "fox nuts", "मखाना"],
        "variants": [
            {"id": "var-makhana-250g", "label": "250 g", "pack_size": 250, "pack_unit": "g", "base_qty": 250, "base_unit": "g"},
        ],
    },

    # ----------------------------------------------------
    # 12. Breakfast & Cereals (cat-12)
    # ----------------------------------------------------
    {
        "id": "prod-cereal-oats",
        "category_id": "cat-12",
        "category_name": "Breakfast & Cereals",
        "name": "100% Whole Grain Rolled Oats",
        "brand": "Pure Harvest",
        "image_url": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&auto=format&fit=crop&q=80",
        "aliases": ["oats", "rolled oats", "ओट्स"],
        "variants": [
            {"id": "var-oats-1kg", "label": "1 kg", "pack_size": 1, "pack_unit": "kg", "base_qty": 1000, "base_unit": "g"},
        ],
    },
    {
        "id": "prod-cereal-cornflakes",
        "category_id": "cat-12",
        "category_name": "Breakfast & Cereals",
        "name": "Crispy Golden Corn Flakes",
        "brand": "Pure Harvest",
        "image_url": "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400&auto=format&fit=crop&q=80",
        "aliases": ["corn flakes", "cornflakes"],
        "variants": [
            {"id": "var-cornflakes-500g", "label": "500 g", "pack_size": 500, "pack_unit": "g", "base_qty": 500, "base_unit": "g"},
        ],
    },
]

# Generate listing definitions for Sri Lakshmi Stores (ret-ravi-1)
EXPANDED_RETAILER_LISTINGS: dict[tuple[str, str], dict] = {
    # Golden Scenario G items (Locked prices & stock)
    ("ret-ravi-1", "var-rice-sona-5kg"): {"mrp_paise": 34000, "selling_price_paise": 30000, "stock_qty": 100, "availability": "active"},
    ("ret-ravi-1", "var-rice-sona-1kg"): {"mrp_paise": 7000, "selling_price_paise": 6500, "stock_qty": 100, "availability": "active"},
    ("ret-ravi-1", "var-sugar-1kg"): {"mrp_paise": 8000, "selling_price_paise": 7500, "stock_qty": 100, "availability": "active"},
    ("ret-ravi-1", "var-sugar-5kg"): {"mrp_paise": 38000, "selling_price_paise": 36000, "stock_qty": 50, "availability": "active"},
    ("ret-ravi-1", "var-oil-sunflower-1l"): {"mrp_paise": 27000, "selling_price_paise": 25000, "stock_qty": 50, "availability": "active"},
    ("ret-ravi-1", "var-oil-sunflower-5l"): {"mrp_paise": 130000, "selling_price_paise": 120000, "stock_qty": 20, "availability": "active"},
    ("ret-ravi-1", "var-dal-toor-500g"): {"mrp_paise": 11000, "selling_price_paise": 10000, "stock_qty": 80, "availability": "active"},
    ("ret-ravi-1", "var-dal-toor-1kg"): {"mrp_paise": 21000, "selling_price_paise": 19500, "stock_qty": 80, "availability": "active"},
    ("ret-ravi-1", "var-atta-5kg"): {"mrp_paise": 26000, "selling_price_paise": 24000, "stock_qty": 60, "availability": "active"},
    ("ret-ravi-1", "var-atta-10kg"): {"mrp_paise": 50000, "selling_price_paise": 46000, "stock_qty": 40, "availability": "active"},

    # Extended Inventory (Rice & Grains)
    ("ret-ravi-1", "var-rice-kolam-5kg"): {"mrp_paise": 38000, "selling_price_paise": 35000, "stock_qty": 45, "availability": "active"},
    ("ret-ravi-1", "var-poha-1kg"): {"mrp_paise": 6500, "selling_price_paise": 5800, "stock_qty": 90, "availability": "active"},
    ("ret-ravi-1", "var-dalia-500g"): {"mrp_paise": 4500, "selling_price_paise": 4000, "stock_qty": 50, "availability": "active"},
    ("ret-ravi-1", "var-idli-rice-5kg"): {"mrp_paise": 32000, "selling_price_paise": 29000, "stock_qty": 40, "availability": "active"},

    # Flours & Atta
    ("ret-ravi-1", "var-maida-1kg"): {"mrp_paise": 5500, "selling_price_paise": 4800, "stock_qty": 65, "availability": "active"},
    ("ret-ravi-1", "var-besan-500g"): {"mrp_paise": 6000, "selling_price_paise": 5400, "stock_qty": 70, "availability": "active"},
    ("ret-ravi-1", "var-besan-1kg"): {"mrp_paise": 11500, "selling_price_paise": 10200, "stock_qty": 60, "availability": "active"},
    ("ret-ravi-1", "var-sooji-1kg"): {"mrp_paise": 6200, "selling_price_paise": 5500, "stock_qty": 80, "availability": "active"},
    ("ret-ravi-1", "var-ragi-1kg"): {"mrp_paise": 7500, "selling_price_paise": 6800, "stock_qty": 35, "availability": "active"},

    # Dal & Pulses
    ("ret-ravi-1", "var-moong-yellow-500g"): {"mrp_paise": 8500, "selling_price_paise": 7800, "stock_qty": 55, "availability": "active"},
    ("ret-ravi-1", "var-moong-yellow-1kg"): {"mrp_paise": 16500, "selling_price_paise": 15000, "stock_qty": 45, "availability": "active"},
    ("ret-ravi-1", "var-chana-dal-1kg"): {"mrp_paise": 11000, "selling_price_paise": 9800, "stock_qty": 60, "availability": "active"},
    ("ret-ravi-1", "var-urad-white-1kg"): {"mrp_paise": 17500, "selling_price_paise": 16000, "stock_qty": 50, "availability": "active"},
    ("ret-ravi-1", "var-rajma-1kg"): {"mrp_paise": 19000, "selling_price_paise": 17500, "stock_qty": 40, "availability": "active"},
    ("ret-ravi-1", "var-kabuli-chana-1kg"): {"mrp_paise": 18000, "selling_price_paise": 16200, "stock_qty": 40, "availability": "active"},

    # Spices
    ("ret-ravi-1", "var-turmeric-200g"): {"mrp_paise": 4800, "selling_price_paise": 4200, "stock_qty": 110, "availability": "active"},
    ("ret-ravi-1", "var-turmeric-500g"): {"mrp_paise": 11000, "selling_price_paise": 9800, "stock_qty": 70, "availability": "active"},
    ("ret-ravi-1", "var-chilli-200g"): {"mrp_paise": 7500, "selling_price_paise": 6500, "stock_qty": 85, "availability": "active"},
    ("ret-ravi-1", "var-chilli-500g"): {"mrp_paise": 17500, "selling_price_paise": 15500, "stock_qty": 60, "availability": "active"},
    ("ret-ravi-1", "var-dhania-500g"): {"mrp_paise": 13000, "selling_price_paise": 11500, "stock_qty": 65, "availability": "active"},
    ("ret-ravi-1", "var-jeera-200g"): {"mrp_paise": 9500, "selling_price_paise": 8500, "stock_qty": 55, "availability": "active"},
    ("ret-ravi-1", "var-mustard-200g"): {"mrp_paise": 3500, "selling_price_paise": 3000, "stock_qty": 90, "availability": "active"},
    ("ret-ravi-1", "var-garam-masala-100g"): {"mrp_paise": 8500, "selling_price_paise": 7600, "stock_qty": 75, "availability": "active"},

    # Sugar & Jaggery
    ("ret-ravi-1", "var-jaggery-1kg"): {"mrp_paise": 9000, "selling_price_paise": 8000, "stock_qty": 60, "availability": "active"},
    ("ret-ravi-1", "var-jaggery-powder-500g"): {"mrp_paise": 5500, "selling_price_paise": 4800, "stock_qty": 45, "availability": "active"},

    # Cooking Oils & Ghee
    ("ret-ravi-1", "var-oil-groundnut-1l"): {"mrp_paise": 24000, "selling_price_paise": 22000, "stock_qty": 40, "availability": "active"},
    ("ret-ravi-1", "var-oil-groundnut-5l"): {"mrp_paise": 115000, "selling_price_paise": 105000, "stock_qty": 18, "availability": "active"},
    ("ret-ravi-1", "var-oil-mustard-1l"): {"mrp_paise": 19000, "selling_price_paise": 17500, "stock_qty": 45, "availability": "active"},
    ("ret-ravi-1", "var-ghee-cow-500ml"): {"mrp_paise": 38000, "selling_price_paise": 35000, "stock_qty": 35, "availability": "active"},
    ("ret-ravi-1", "var-ghee-cow-1l"): {"mrp_paise": 72000, "selling_price_paise": 66000, "stock_qty": 25, "availability": "active"},

    # Sauces, Pickles & Spreads
    ("ret-ravi-1", "var-pickle-mango-500g"): {"mrp_paise": 14000, "selling_price_paise": 12500, "stock_qty": 50, "availability": "active"},
    ("ret-ravi-1", "var-ketchup-950g"): {"mrp_paise": 16000, "selling_price_paise": 14000, "stock_qty": 40, "availability": "active"},

    # Dry Fruits & Nuts
    ("ret-ravi-1", "var-badam-250g"): {"mrp_paise": 26000, "selling_price_paise": 23500, "stock_qty": 30, "availability": "active"},
    ("ret-ravi-1", "var-badam-500g"): {"mrp_paise": 51000, "selling_price_paise": 46000, "stock_qty": 25, "availability": "active"},
    ("ret-ravi-1", "var-kaju-250g"): {"mrp_paise": 29000, "selling_price_paise": 26500, "stock_qty": 30, "availability": "active"},
    ("ret-ravi-1", "var-kaju-500g"): {"mrp_paise": 57000, "selling_price_paise": 52000, "stock_qty": 20, "availability": "active"},
    ("ret-ravi-1", "var-kishmish-250g"): {"mrp_paise": 13000, "selling_price_paise": 11500, "stock_qty": 45, "availability": "active"},
    ("ret-ravi-1", "var-dates-500g"): {"mrp_paise": 18000, "selling_price_paise": 16000, "stock_qty": 35, "availability": "active"},

    # Beverages
    ("ret-ravi-1", "var-tea-500g"): {"mrp_paise": 28000, "selling_price_paise": 25000, "stock_qty": 60, "availability": "active"},
    ("ret-ravi-1", "var-tea-1kg"): {"mrp_paise": 54000, "selling_price_paise": 48500, "stock_qty": 40, "availability": "active"},
    ("ret-ravi-1", "var-coffee-500g"): {"mrp_paise": 32000, "selling_price_paise": 29000, "stock_qty": 30, "availability": "active"},

    # Snacks
    ("ret-ravi-1", "var-peanuts-200g"): {"mrp_paise": 5500, "selling_price_paise": 4800, "stock_qty": 80, "availability": "active"},
    ("ret-ravi-1", "var-makhana-250g"): {"mrp_paise": 28000, "selling_price_paise": 24500, "stock_qty": 25, "availability": "active"},

    # Breakfast Cereals
    ("ret-ravi-1", "var-oats-1kg"): {"mrp_paise": 21000, "selling_price_paise": 18500, "stock_qty": 40, "availability": "active"},
    ("ret-ravi-1", "var-cornflakes-500g"): {"mrp_paise": 19500, "selling_price_paise": 17500, "stock_qty": 35, "availability": "active"},

    # Lakeview Store (ret-farah-2)
    ("ret-farah-2", "var-rice-sona-5kg"): {"mrp_paise": 34000, "selling_price_paise": 32000, "stock_qty": 50, "availability": "active"},
    ("ret-farah-2", "var-rice-basmati-5kg"): {"mrp_paise": 34000, "selling_price_paise": 32000, "stock_qty": 50, "availability": "active"},
    ("ret-farah-2", "var-sugar-1kg"): {"mrp_paise": 8000, "selling_price_paise": 7600, "stock_qty": 50, "availability": "active"},
    ("ret-farah-2", "var-oil-sunflower-1l"): {"mrp_paise": 27000, "selling_price_paise": 25500, "stock_qty": 50, "availability": "active"},
    ("ret-farah-2", "var-dal-toor-500g"): {"mrp_paise": 11000, "selling_price_paise": 10500, "stock_qty": 50, "availability": "active"},
}
