import os
from typing import Any

TOPICS = [
    "pact.orders",
    "pact.inventory",
    "pact.payments",
    "pact.catalogue",
]

EVENT_TOPIC_CONFIG: dict[str, tuple[str, str]] = {
    # event_type -> (topic, key_field)
    "order.submitted": ("pact.orders", "order_id"),
    "order.accepted": ("pact.orders", "order_id"),
    "order.rejected": ("pact.orders", "order_id"),
    "bill.finalised": ("pact.orders", "order_id"),
    "invoice.created": ("pact.orders", "order_id"),
    "delivery.status_changed": ("pact.orders", "order_id"),
    "inventory.stock_changed": ("pact.inventory", "listing_id"),
    "inventory.low_stock": ("pact.inventory", "listing_id"),
    "payment.succeeded": ("pact.payments", "invoice_id"),
    "payment.failed": ("pact.payments", "invoice_id"),
    "catalogue.product_changed": ("pact.catalogue", "product_id"),
}


def get_topic_and_key(event_type: str, payload: dict[str, Any], aggregate_id: str) -> tuple[str, str]:
    if event_type in EVENT_TOPIC_CONFIG:
        topic, key_field = EVENT_TOPIC_CONFIG[event_type]
        key = str(payload.get(key_field) or aggregate_id)
        return topic, key
    return "pact.orders", aggregate_id


def create_kafka_topics_if_needed(bootstrap_servers: str, ssl_config: dict[str, Any] | None = None) -> bool:
    """
    Topic creation script for local or Aiven Kafka broker.
    """
    try:
        from kafka.admin import KafkaAdminClient, NewTopic
        admin_kwargs: dict[str, Any] = {"bootstrap_servers": bootstrap_servers}
        if ssl_config:
            admin_kwargs.update(ssl_config)
        admin = KafkaAdminClient(**admin_kwargs)
        existing = admin.list_topics()
        new_topics = [
            NewTopic(name=t, num_partitions=1, replication_factor=1)
            for t in TOPICS
            if t not in existing
        ]
        if new_topics:
            admin.create_topics(new_topics=new_topics, validate_only=False)
        admin.close()
        return True
    except Exception as e:
        # In offline/mock test environments, ignore broker connection error
        return False
