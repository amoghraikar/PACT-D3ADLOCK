#!/usr/bin/env python3
"""
PACT - Kafka Connectivity & Producer/Consumer Verification
Tests connection to Aiven Apache Kafka (or local fallback).
Supports SSL certificates, SASL_SSL, and PLAINTEXT.
"""

import json
import os
import sys
import time
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
KAFKA_SECURITY_PROTOCOL = os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT")
KAFKA_TOPIC = os.getenv("KAFKA_TEST_TOPIC", "pact-healthcheck-topic")

# SSL Certificate paths (standard Aiven Kafka SSL)
KAFKA_SSL_CA_PATH = os.getenv("KAFKA_SSL_CA_PATH")
KAFKA_SSL_CERT_PATH = os.getenv("KAFKA_SSL_CERT_PATH")
KAFKA_SSL_KEY_PATH = os.getenv("KAFKA_SSL_KEY_PATH")

# SASL credentials (alternative Aiven Kafka SASL)
KAFKA_SASL_USERNAME = os.getenv("KAFKA_SASL_USERNAME")
KAFKA_SASL_PASSWORD = os.getenv("KAFKA_SASL_PASSWORD")

if not KAFKA_BOOTSTRAP_SERVERS:
    print("❌ ERROR: KAFKA_BOOTSTRAP_SERVERS is not set.")
    print("Please set KAFKA_BOOTSTRAP_SERVERS (e.g., host:port) in your .env file.")
    sys.exit(1)

print(f"Connecting to Kafka Bootstrap Servers: {KAFKA_BOOTSTRAP_SERVERS}")
print(f"Security Protocol: {KAFKA_SECURITY_PROTOCOL}")
print(f"Test Topic: {KAFKA_TOPIC}")

from kafka import KafkaProducer, KafkaConsumer

client_config = {
    "bootstrap_servers": [s.strip() for s in KAFKA_BOOTSTRAP_SERVERS.split(",")],
    "security_protocol": KAFKA_SECURITY_PROTOCOL,
}

if KAFKA_SECURITY_PROTOCOL in ("SSL", "SASL_SSL"):
    if KAFKA_SSL_CA_PATH and os.path.exists(KAFKA_SSL_CA_PATH):
        client_config["ssl_cafile"] = KAFKA_SSL_CA_PATH
    if KAFKA_SSL_CERT_PATH and os.path.exists(KAFKA_SSL_CERT_PATH):
        client_config["ssl_certfile"] = KAFKA_SSL_CERT_PATH
    if KAFKA_SSL_KEY_PATH and os.path.exists(KAFKA_SSL_KEY_PATH):
        client_config["ssl_keyfile"] = KAFKA_SSL_KEY_PATH

if KAFKA_SECURITY_PROTOCOL in ("SASL_SSL", "SASL_PLAINTEXT"):
    client_config["sasl_mechanism"] = os.getenv("KAFKA_SASL_MECHANISM", "SCRAM-SHA-256")
    client_config["sasl_plain_username"] = KAFKA_SASL_USERNAME
    client_config["sasl_plain_password"] = KAFKA_SASL_PASSWORD

try:
    print("\n1. Initializing Producer...")
    producer = KafkaProducer(
        **client_config,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        request_timeout_ms=10000,
    )
    
    test_payload = {
        "event": "healthcheck",
        "timestamp": time.time(),
        "source": "pact-setup-verification",
    }
    
    print(f"2. Sending test event to '{KAFKA_TOPIC}'...")
    future = producer.send(KAFKA_TOPIC, test_payload)
    record_metadata = future.get(timeout=10)
    print(f"   Message sent successfully! Partition: {record_metadata.partition}, Offset: {record_metadata.offset}")
    producer.flush()
    producer.close()

    print("\n3. Initializing Consumer to verify read...")
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        **client_config,
        auto_offset_reset="earliest",
        consumer_timeout_ms=10000,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        group_id="pact-healthcheck-group",
    )
    
    received = False
    for msg in consumer:
        if msg.value.get("event") == "healthcheck":
            print(f"   Received verification message from partition {msg.partition}, offset {msg.offset}!")
            received = True
            break

    consumer.close()
    if received:
        print("\n✅ Kafka Producer & Consumer test PASSED successfully!")
    else:
        print("\n⚠️ Kafka Producer succeeded, but Consumer timed out reading the test message (topic may need creation).")

except Exception as e:
    print(f"\n❌ Kafka test FAILED: {e}")
    sys.exit(1)
