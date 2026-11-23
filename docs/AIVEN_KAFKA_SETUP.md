# PACT — Aiven Kafka Production Event Streaming Setup

This guide details the integration of **Aiven Kafka** with PACT for enterprise event-driven architecture, decoupled background event processing, and transactional outbox delivery.

---

## 1. Architecture Overview

PACT utilizes a **Transactional Outbox Pattern** to ensure zero dual-write anomalies:
1. Business mutations (Orders, Packed Items, Final Invoices, Payments) are atomically persisted to PostgreSQL in the same transaction as an `EventOutbox` record.
2. The `outbox_publisher` worker polls pending outbox entries with `SELECT ... FOR UPDATE SKIP LOCKED` and publishes them to Aiven Kafka.
3. Once the Kafka broker acknowledges the message with an offset, the outbox record is marked `PUBLISHED`.
4. Downstream microservices and background consumers (`kafka_consumer.py`) subscribe to domain topics to dispatch notifications, update analytics, and execute asynchronous side effects.

```
PostgreSQL (Transaction)
 ┌──────────────────────┐
 │ Business Entity (DB) │
 │ EventOutbox Record   │
 └──────────┬───────────┘
            │ SELECT FOR UPDATE SKIP LOCKED
            ▼
   PACT Outbox Publisher
            │ SASL_SSL SCRAM-SHA-256
            ▼
      Aiven Kafka
  (pact.order.events, pact.billing.events, etc.)
            │
            ▼
   PACT Kafka Consumer ──► In-App / SMS / WhatsApp Dispatch
```

---

## 2. Aiven Kafka Cluster Provisioning

1. **Log in to Aiven Console**:
   Navigate to [https://console.aiven.io](https://console.aiven.io) and create a project (e.g. `pact-production`).
2. **Create Kafka Service**:
   - Service Type: **Apache Kafka**
   - Cloud Provider: **AWS / GCP** (select the region matching your Render services, e.g. `us-west-1` or `asia-south1`).
   - Plan: **Startup-2** (3 brokers for high-availability quorum) or **Business-4**.
   - Service Name: `kafka-pact-prod`.
3. **Download CA Certificate**:
   - In the service overview tab, download `ca.pem` (Project CA certificate).
   - For Render web services, store the PEM text in an environment variable `KAFKA_CA_CERT` or upload to secret files `/etc/secrets/aiven-ca.pem`.

---

## 3. Security & Authentication Configuration

PACT connects to Aiven Kafka over **SASL_SSL** with **SCRAM-SHA-256** or **mTLS**:

### A. SCRAM-SHA-256 (Recommended for Containerized Apps)
1. In the Aiven Console, go to **Users & Topics** > **Users**.
2. Add a service user:
   - Username: `pact_app_user`
   - Authentication Type: `SCRAM-SHA-256`
   - Generate / copy the generated password.
3. Grant topic permissions:
   - `pact.*` with `ReadWrite` permission.

### B. Environment Variables for Render
Set the following environment variables in `render.yaml` or Render Dashboard:

```ini
EVENT_TRANSPORT=kafka
KAFKA_BOOTSTRAP_SERVERS="kafka-pact-prod-xxxx.aivencloud.com:12345"
KAFKA_SECURITY_PROTOCOL=SASL_SSL
KAFKA_SASL_MECHANISM=SCRAM-SHA-256
KAFKA_SASL_USERNAME=pact_app_user
KAFKA_SASL_PASSWORD="YOUR_AIVEN_SCRAM_PASSWORD"
KAFKA_CONSUMER_GROUP="pact-production-workers"
KAFKA_TOPIC_PREFIX="pact"
```

---

## 4. Production Topics & Partitioning Strategy

Create the following topics in Aiven Kafka with **3 partitions** (min insync replicas = 2) for optimal throughput and ordered partition processing:

| Topic Name | Partition Key | Purpose |
| :--- | :--- | :--- |
| `pact.order.events` | `order_id` / `society_id` | `ORDER_CREATED`, `ORDER_ACCEPTED`, `ORDER_PACKED`, `ORDER_DISPATCHED`, `ORDER_COMPLETED` |
| `pact.billing.events` | `cycle_id` / `society_id` | `BILL_FINALISED`, `INVOICE_GENERATED`, `INVOICE_PAID` |
| `pact.inventory.events` | `variant_id` / `retailer_id` | `STOCK_INWARDED`, `STOCK_ADJUSTED`, `LOW_STOCK_ALERT` |
| `pact.notification.events` | `user_id` | Push notification triggers, payment reminder queues, SMS notifications |

---

## 5. Verification & Health Monitoring

To verify connection from PACT backend:

```bash
# In PACT API environment:
python -c "
from app.core.config import settings
from app.infrastructure.events.kafka_transport import KafkaEventProducer
producer = KafkaEventProducer()
print('Kafka connection initialized successfully!')
"
```

Aiven metrics to monitor in the console:
- **Consumer Group Lag**: Verify `pact-production-workers` lag remains near 0.
- **Produce Request Latency**: Expected < 15ms.
- **Disk Storage**: Set auto-expansion or retention policy (7 days default: `log.retention.hours=168`).
