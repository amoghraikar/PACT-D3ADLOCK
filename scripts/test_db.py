#!/usr/bin/env python3
"""
PACT - Database Connectivity & Health Check
Tests connection to Aiven PostgreSQL (or local fallback) using SQLAlchemy.
Reads connection parameters from environment variables.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL is not set.")
    print("Please set DATABASE_URL in your .env file or environment.")
    print("Format: postgresql://<user>:<password>@<host>:<port>/<dbname>?sslmode=require")
    sys.exit(1)

print(f"Connecting to database...")
# Mask password in logs
masked_url = DATABASE_URL
if "@" in masked_url:
    prefix = masked_url.split("@")[0]
    suffix = masked_url.split("@")[1]
    if ":" in prefix:
        scheme_user = prefix.rsplit(":", 1)[0]
        masked_url = f"{scheme_user}:****@{suffix}"
print(f"URL: {masked_url}")

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version(), current_database(), current_user;")).fetchone()
        print("\n✅ Database connection SUCCESSFUL!")
        print(f"   Database: {result[1]}")
        print(f"   User:     {result[2]}")
        print(f"   Engine:   {result[0]}")
except Exception as e:
    print(f"\n❌ Database connection FAILED: {e}")
    sys.exit(1)
