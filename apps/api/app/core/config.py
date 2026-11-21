from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "dev"
    API_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "PACT API"

    # Database URLs (PostgreSQL 16)
    DATABASE_URL: str = "postgresql+psycopg://pactuser:pactpassword@localhost:5432/pact_dev"
    TEST_DATABASE_URL: str = "postgresql+psycopg://pactuser:pactpassword@localhost:5432/pact_test"

    # Timezone & Cycle
    BUSINESS_TZ: str = "Asia/Kolkata"
    CYCLE_CUTOFF_DAY: int = 25

    # Security & Auth
    APP_SECRET: str = "pact-super-secret-key-change-in-production"
    OTP_MODE: str = "dev"
    SESSION_COOKIE_NAME: str = "pact_session"
    SESSION_MAX_AGE_DAYS: int = 7

    # Transports & Integrations
    EVENT_TRANSPORT: str = "inline"
    SEARCH_BACKEND: str = "postgres"
    PAYMENT_GATEWAY: str = "mock"
    WEB_PUSH_ENABLED: bool = False

    # Razorpay (optional in dev)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
