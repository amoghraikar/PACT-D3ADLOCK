#!/usr/bin/env python3
"""
PACT - OpenSearch Connectivity & Query Verification
Tests connection to Aiven OpenSearch (or local fallback).
Checks cluster health, indexes a temporary test document, and performs a search.
"""

import os
import sys
import time
from dotenv import load_dotenv
from opensearchpy import OpenSearch

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

OPENSEARCH_URL = os.getenv("OPENSEARCH_URL")
OPENSEARCH_HOST = os.getenv("OPENSEARCH_HOST")
OPENSEARCH_PORT = int(os.getenv("OPENSEARCH_PORT", "9200"))
OPENSEARCH_USER = os.getenv("OPENSEARCH_USER", "avnadmin")
OPENSEARCH_PASSWORD = os.getenv("OPENSEARCH_PASSWORD")
OPENSEARCH_USE_SSL = os.getenv("OPENSEARCH_USE_SSL", "true").lower() in ("true", "1", "yes")

if not OPENSEARCH_URL and not OPENSEARCH_HOST:
    print("❌ ERROR: OPENSEARCH_URL or OPENSEARCH_HOST is not set.")
    print("Please configure OPENSEARCH_URL (e.g. https://user:pass@host:port) in .env")
    sys.exit(1)

print("Connecting to OpenSearch...")
try:
    if OPENSEARCH_URL:
        client = OpenSearch(
            hosts=[OPENSEARCH_URL],
            use_ssl=OPENSEARCH_USE_SSL,
            verify_certs=False,  # Suitable for test environments with custom/self-signed certs
            ssl_show_warn=False,
            timeout=10,
        )
    else:
        http_auth = (OPENSEARCH_USER, OPENSEARCH_PASSWORD) if OPENSEARCH_PASSWORD else None
        client = OpenSearch(
            hosts=[{"host": OPENSEARCH_HOST, "port": OPENSEARCH_PORT}],
            http_auth=http_auth,
            use_ssl=OPENSEARCH_USE_SSL,
            verify_certs=False,
            ssl_show_warn=False,
            timeout=10,
        )

    # 1. Cluster info & health
    info = client.info()
    print("\n✅ Connected to OpenSearch Cluster!")
    print(f"   Cluster Name:    {info.get('cluster_name')}")
    print(f"   Version:         {info.get('version', {}).get('number')}")
    print(f"   Lucene Version:  {info.get('version', {}).get('lucene_version')}")

    health = client.cluster.health()
    print(f"   Cluster Status:  {health.get('status').upper()}")

    # 2. Test index & search
    test_index = "pact-connectivity-test"
    test_doc = {
        "title": "PACT Collective Commerce Healthcheck",
        "category": "groceries",
        "timestamp": time.time(),
        "status": "active",
    }

    print(f"\n1. Indexing test document into '{test_index}'...")
    response = client.index(index=test_index, body=test_doc, refresh=True)
    doc_id = response.get("_id")
    print(f"   Indexed document ID: {doc_id}")

    print("2. Querying document back...")
    search_query = {"query": {"match": {"category": "groceries"}}}
    search_res = client.search(index=test_index, body=search_query)
    hits = search_res.get("hits", {}).get("total", {}).get("value", 0)
    print(f"   Found {hits} matching document(s).")

    print("3. Cleaning up test index...")
    client.indices.delete(index=test_index, ignore=[400, 404])
    print("   Test index cleaned up.")

    print("\n✅ OpenSearch Indexing & Search test PASSED successfully!")

except Exception as e:
    print(f"\n❌ OpenSearch test FAILED: {e}")
    sys.exit(1)
