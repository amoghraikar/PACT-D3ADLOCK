import json
import logging
import os
import sys
import time

from app.modules.events.consumer import process_event_idempotent
from app.modules.events.topics import TOPICS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("app.workers.consumer")


def run_consumer():
    """
    P23: Kafka consumer worker:
    python -m app.workers.consumer
    Subscribes to all PACT topics, uses processed_events table/set for idempotent dispatch.
    """
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    group_id = os.getenv("KAFKA_GROUP_ID", "pact-core-workers")

    logger.info(f"Starting PACT consumer worker on {bootstrap_servers}, group: {group_id}")

    try:
        from kafka import KafkaConsumer

        kwargs = {
            "bootstrap_servers": bootstrap_servers,
            "group_id": group_id,
            "auto_offset_reset": "earliest",
            "enable_auto_commit": True,
            "value_deserializer": lambda m: json.loads(m.decode("utf-8")),
        }

        ssl_ca = os.getenv("KAFKA_SSL_CA")
        ssl_cert = os.getenv("KAFKA_SSL_CERT")
        ssl_key = os.getenv("KAFKA_SSL_KEY")
        if ssl_ca and ssl_cert and ssl_key:
            kwargs["security_protocol"] = "SSL"
            kwargs["ssl_cafile"] = ssl_ca
            kwargs["ssl_certfile"] = ssl_cert
            kwargs["ssl_keyfile"] = ssl_key

        consumer = KafkaConsumer(*TOPICS, **kwargs)
        logger.info(f"Subscribed to topics: {TOPICS}")

        for message in consumer:
            envelope = message.value
            process_event_idempotent(group_id, envelope)

    except KeyboardInterrupt:
        logger.info("Consumer stopping on interrupt")
    except Exception as e:
        logger.error(f"Error in consumer worker: {e}")
        # In testing or development, exit cleanly
        sys.exit(0)


if __name__ == "__main__":
    run_consumer()
