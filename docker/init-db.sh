#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE pact_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pact_test')\gexec
    GRANT ALL PRIVILEGES ON DATABASE pact_test TO $POSTGRES_USER;
EOSQL
