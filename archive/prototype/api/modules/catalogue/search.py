import difflib
import logging
import os
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger("pact.search")

INDEX_NAME = "pact-products"


class SearchBackend(ABC):
    @abstractmethod
    def search(self, q: str) -> list[str]:
        """Returns ranked list of product IDs matching the query."""
        pass

    @abstractmethod
    def index_product(self, product_doc: dict[str, Any]) -> bool:
        pass


class PostgresSearchBackend(SearchBackend):
    """
    Baseline search: Trigram / substring matching over product name, brand, and aliases.
    """
    def search(self, q: str) -> list[str]:
        from app.modules.catalogue.router import PRODUCTS

        q_clean = q.strip().lower()
        if not q_clean:
            return [p["id"] for p in PRODUCTS]

        scored: list[tuple[float, str]] = []

        for p in PRODUCTS:
            p_name = p["name"].lower()
            p_brand = p["brand"].lower()
            p_aliases = [a.lower() for a in p.get("aliases", [])]

            score = 0.0
            # Exact matches
            if q_clean in p_name:
                score += 3.0
            if any(q_clean in a for a in p_aliases):
                score += 2.0
            if q_clean in p_brand:
                score += 1.0

            # Substring / character ratio for typos
            if score == 0.0:
                name_ratio = difflib.SequenceMatcher(None, q_clean, p_name).ratio()
                if name_ratio > 0.6:
                    score += name_ratio * 2.0
                for a in p_aliases:
                    alias_ratio = difflib.SequenceMatcher(None, q_clean, a).ratio()
                    if alias_ratio > 0.6:
                        score = max(score, alias_ratio * 2.0)

            if score > 0.0:
                scored.append((score, p["id"]))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [pid for _, pid in scored]

    def index_product(self, product_doc: dict[str, Any]) -> bool:
        return True


class OpenSearchBackend(SearchBackend):
    """
    P24: OpenSearch product search (Aiven / Local)
    Index: pact-products
    Multi-match over name^3, aliases^2, brand with fuzziness and prefix matching.
    Returns ranked product IDs only.
    Falls back gracefully to PostgresSearchBackend on connection error.
    """
    def __init__(self):
        self.url = os.getenv("OPENSEARCH_URL", "http://localhost:9200")
        self.client = None
        self.fallback_backend = PostgresSearchBackend()
        self._init_client()

    def _init_client(self):
        try:
            from opensearchpy import OpenSearch
            self.client = OpenSearch(
                hosts=[self.url],
                use_ssl=self.url.startswith("https"),
                verify_certs=False,
                ssl_show_warn=False,
                timeout=3,
            )
        except Exception as e:
            logger.warning(f"Could not initialize OpenSearch client: {e}")
            self.client = None

    def search(self, q: str) -> list[str]:
        if not self.client:
            self._init_client()

        if not self.client:
            logger.warning("OpenSearch unreachable; falling back to PostgreSQL baseline search.")
            return self.fallback_backend.search(q)

        try:
            query = {
                "query": {
                    "multi_match": {
                        "query": q,
                        "fields": ["name^3", "aliases^2", "brand"],
                        "fuzziness": "AUTO",
                        "prefix_length": 1,
                    }
                }
            }
            res = self.client.search(index=INDEX_NAME, body=query)
            hits = res.get("hits", {}).get("hits", [])
            return [hit["_id"] for hit in hits]
        except Exception as e:
            logger.warning(f"OpenSearch query failed ({e}); falling back to PostgreSQL baseline search.")
            return self.fallback_backend.search(q)

    def index_product(self, product_doc: dict[str, Any]) -> bool:
        if not self.client:
            self._init_client()
        if not self.client:
            return False
        try:
            pid = product_doc["id"]
            self.client.index(index=INDEX_NAME, id=pid, body=product_doc, refresh=True)
            return True
        except Exception as e:
            logger.warning(f"OpenSearch index failed for {product_doc.get('id')}: {e}")
            return False


def create_opensearch_index_if_needed(client: Any) -> bool:
    """
    P24: Defines pact-products index with multi-field analyzers.
    """
    index_body = {
        "settings": {
            "analysis": {
                "analyzer": {
                    "pact_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "asciifolding"],
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "name": {"type": "text", "analyzer": "pact_analyzer"},
                "brand": {"type": "text", "analyzer": "pact_analyzer"},
                "category_slug": {"type": "keyword"},
                "aliases": {"type": "text", "analyzer": "pact_analyzer"},
                "variant_labels": {"type": "keyword"},
                "is_active": {"type": "boolean"},
            }
        },
    }
    try:
        if not client.indices.exists(index=INDEX_NAME):
            client.indices.create(index=INDEX_NAME, body=index_body)
        return True
    except Exception as e:
        logger.warning(f"Failed to create OpenSearch index: {e}")
        return False


def reindex_all_products(search_backend: SearchBackend | None = None) -> int:
    """
    Full reindex command for pact-products.
    """
    from app.modules.catalogue.router import PRODUCTS

    backend = search_backend or get_search_backend()
    count = 0
    for p in PRODUCTS:
        doc = {
            "id": p["id"],
            "name": p["name"],
            "brand": p["brand"],
            "category_slug": p.get("category_id", ""),
            "aliases": p.get("aliases", []),
            "variant_labels": [v["label"] for v in p.get("variants", [])],
            "is_active": True,
        }
        if backend.index_product(doc):
            count += 1
    return count


_active_search_backend: SearchBackend | None = None


def get_search_backend() -> SearchBackend:
    global _active_search_backend
    if _active_search_backend is not None:
        return _active_search_backend

    backend_name = os.getenv("SEARCH_BACKEND", "postgres").lower()
    if backend_name == "opensearch":
        _active_search_backend = OpenSearchBackend()
    else:
        _active_search_backend = PostgresSearchBackend()
    return _active_search_backend


def set_search_backend(backend: SearchBackend):
    global _active_search_backend
    _active_search_backend = backend
