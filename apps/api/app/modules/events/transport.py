import abc
import json
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger("pact.events.transport")


class EventTransport(abc.ABC):
    """Abstract pluggable event transport."""

    @abc.abstractmethod
    def publish(self, topic: str, key: str, payload: dict[str, Any]) -> bool:
        """Publishes an event to a topic with a partitioning key."""
        pass

    @abc.abstractmethod
    def consume(
        self, topic: str, group_id: str = "pact-group", max_records: int = 10, timeout_ms: int = 1000
    ) -> list[dict[str, Any]]:
        """Consumes a batch of events from a topic."""
        pass


class InMemoryEventTransport(EventTransport):
    """
    Deterministic in-memory event bus for fast, isolated unit testing.
    Keeps an append-only log of events per topic.
    """

    def __init__(self):
        self._topics: dict[str, list[dict[str, Any]]] = {}
        self._consumed_offsets: dict[str, int] = {}  # (group_id:topic) -> offset
        self.published_events: list[dict[str, Any]] = []

    def clear(self) -> None:
        self._topics.clear()
        self._consumed_offsets.clear()
        self.published_events.clear()

    def publish(self, topic: str, key: str, payload: dict[str, Any]) -> bool:
        if topic not in self._topics:
            self._topics[topic] = []

        record = {
            "key": key,
            "payload": payload,
            "topic": topic,
        }
        self._topics[topic].append(record)
        self.published_events.append(record)
        return True

    def consume(
        self, topic: str, group_id: str = "pact-group", max_records: int = 10, timeout_ms: int = 1000
    ) -> list[dict[str, Any]]:
        offset_key = f"{group_id}:{topic}"
        curr_offset = self._consumed_offsets.get(offset_key, 0)

        events = self._topics.get(topic, [])
        batch = events[curr_offset : curr_offset + max_records]
        self._consumed_offsets[offset_key] = curr_offset + len(batch)
        return batch


class KafkaEventTransport(EventTransport):
    """
    Apache Kafka event transport.
    Supports local Kafka and Aiven Kafka via SASL_SSL / SCRAM-SHA-256.
    Never hardcodes credentials; all parameters configured via environment variables.
    """

    def __init__(self):
        self.bootstrap_servers = settings.KAFKA_BOOTSTRAP_SERVERS
        self.security_protocol = settings.KAFKA_SECURITY_PROTOCOL
        self.sasl_mechanism = settings.KAFKA_SASL_MECHANISM
        self.sasl_username = settings.KAFKA_SASL_USERNAME
        self.sasl_password = settings.KAFKA_SASL_PASSWORD
        self._fallback = InMemoryEventTransport()

    def _get_producer_config(self) -> dict[str, Any]:
        conf: dict[str, Any] = {
            "bootstrap_servers": self.bootstrap_servers.split(","),
            "value_serializer": lambda v: json.dumps(v).encode("utf-8"),
            "key_serializer": lambda k: k.encode("utf-8") if k else None,
            "acks": "all",
            "retries": 3,
        }
        if self.security_protocol in ("SASL_SSL", "SASL_PLAINTEXT"):
            conf["security_protocol"] = self.security_protocol
            conf["sasl_mechanism"] = self.sasl_mechanism
            conf["sasl_plain_username"] = self.sasl_username
            conf["sasl_plain_password"] = self.sasl_password
        return conf

    def publish(self, topic: str, key: str, payload: dict[str, Any]) -> bool:
        if not self.bootstrap_servers:
            logger.debug("No KAFKA_BOOTSTRAP_SERVERS configured; routing to in-memory fallback.")
            return self._fallback.publish(topic, key, payload)

        try:
            from kafka import KafkaProducer

            producer = KafkaProducer(**self._get_producer_config())
            future = producer.send(topic, key=key, value=payload)
            future.get(timeout=10)
            producer.close()
            return True
        except Exception as exc:
            logger.error("Failed to publish to Kafka topic %s: %s", topic, exc)
            return self._fallback.publish(topic, key, payload)

    def consume(
        self, topic: str, group_id: str = "pact-group", max_records: int = 10, timeout_ms: int = 1000
    ) -> list[dict[str, Any]]:
        if not self.bootstrap_servers:
            return self._fallback.consume(topic, group_id, max_records, timeout_ms)

        try:
            from kafka import KafkaConsumer

            conf = {
                "bootstrap_servers": self.bootstrap_servers.split(","),
                "group_id": group_id,
                "auto_offset_reset": settings.KAFKA_AUTO_OFFSET_RESET,
                "enable_auto_commit": True,
                "value_deserializer": lambda v: json.loads(v.decode("utf-8")),
                "key_deserializer": lambda k: k.decode("utf-8") if k else None,
                "consumer_timeout_ms": timeout_ms,
            }
            if self.security_protocol in ("SASL_SSL", "SASL_PLAINTEXT"):
                conf["security_protocol"] = self.security_protocol
                conf["sasl_mechanism"] = self.sasl_mechanism
                conf["sasl_plain_username"] = self.sasl_username
                conf["sasl_plain_password"] = self.sasl_password

            consumer = KafkaConsumer(topic, **conf)
            records = []
            for msg in consumer:
                records.append({
                    "key": msg.key,
                    "payload": msg.value,
                    "topic": msg.topic,
                    "offset": msg.offset,
                })
                if len(records) >= max_records:
                    break
            consumer.close()
            return records
        except Exception as exc:
            logger.error("Failed to consume from Kafka topic %s: %s", topic, exc)
            return self._fallback.consume(topic, group_id, max_records, timeout_ms)


_in_memory_instance = InMemoryEventTransport()


def get_event_transport() -> EventTransport:
    if settings.EVENT_TRANSPORT == "kafka" and settings.KAFKA_BOOTSTRAP_SERVERS:
        return KafkaEventTransport()
    return _in_memory_instance
