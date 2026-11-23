import json
import os
from abc import ABC, abstractmethod
from typing import Any

from app.modules.events.topics import get_topic_and_key


class EventTransport(ABC):
    @abstractmethod
    def publish(self, topic: str, key: str, event_envelope: dict[str, Any]) -> bool:
        """Publishes event to transport. Returns True if acknowledged, False otherwise."""
        pass


class InlineTransport(EventTransport):
    """
    Default inline transport: dispatches event to in-process handlers immediately.
    """
    def publish(self, topic: str, key: str, event_envelope: dict[str, Any]) -> bool:
        from app.modules.events.dispatch import dispatch_event
        dispatch_event(event_envelope)
        return True


class MockKafkaTransport(EventTransport):
    """
    In-memory broker simulating Kafka KRaft for unit/integration tests:
    - Stores topic records per partition
    - Supports broker down simulation
    - Supports replaying topic records from offset 0
    """
    def __init__(self):
        self.topics: dict[str, list[tuple[str, dict[str, Any]]]] = {
            "pact.orders": [],
            "pact.inventory": [],
            "pact.payments": [],
            "pact.catalogue": [],
        }
        self.is_broker_down = False

    def publish(self, topic: str, key: str, event_envelope: dict[str, Any]) -> bool:
        if self.is_broker_down:
            return False
        if topic not in self.topics:
            self.topics[topic] = []
        self.topics[topic].append((key, event_envelope))
        return True

    def replay_topic(self, topic: str) -> list[tuple[str, dict[str, Any]]]:
        return list(self.topics.get(topic, []))


class KafkaTransport(EventTransport):
    """
    Production Kafka transport using kafka-python-ng.
    Supports Aiven Kafka SSL settings from environment:
    - KAFKA_BOOTSTRAP_SERVERS
    - KAFKA_SSL_CA
    - KAFKA_SSL_CERT
    - KAFKA_SSL_KEY
    """
    def __init__(self):
        self.bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        self.producer = None
        self._init_producer()

    def _init_producer(self):
        try:
            from kafka import KafkaProducer
            ssl_ca = os.getenv("KAFKA_SSL_CA")
            ssl_cert = os.getenv("KAFKA_SSL_CERT")
            ssl_key = os.getenv("KAFKA_SSL_KEY")

            kwargs: dict[str, Any] = {
                "bootstrap_servers": self.bootstrap_servers,
                "value_serializer": lambda v: json.dumps(v).encode("utf-8"),
                "key_serializer": lambda k: k.encode("utf-8") if k else None,
                "acks": "all",
                "retries": 3,
            }

            if ssl_ca and ssl_cert and ssl_key:
                kwargs["security_protocol"] = "SSL"
                kwargs["ssl_cafile"] = ssl_ca
                kwargs["ssl_certfile"] = ssl_cert
                kwargs["ssl_keyfile"] = ssl_key

            self.producer = KafkaProducer(**kwargs)
        except Exception:
            self.producer = None

    def publish(self, topic: str, key: str, event_envelope: dict[str, Any]) -> bool:
        if not self.producer:
            self._init_producer()
            if not self.producer:
                return False
        try:
            future = self.producer.send(topic, key=key, value=event_envelope)
            record_metadata = future.get(timeout=10.0)
            return record_metadata is not None
        except Exception:
            return False


_active_transport: EventTransport | None = None


def get_transport() -> EventTransport:
    global _active_transport
    if _active_transport is not None:
        return _active_transport

    transport_name = os.getenv("EVENT_TRANSPORT", "inline").lower()
    if transport_name == "kafka":
        _active_transport = KafkaTransport()
    elif transport_name == "mock_kafka":
        _active_transport = MockKafkaTransport()
    else:
        _active_transport = InlineTransport()
    return _active_transport


def set_transport(transport: EventTransport):
    global _active_transport
    _active_transport = transport
