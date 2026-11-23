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
    CYCLE_CUTOFF_DAY: int = 22
    CYCLE_CUTOFF_HOUR: int = 17  # 5 PM (24-hour format)
    CYCLE_CUTOFF_MINUTE: int = 27  # 27 minutes

    # Security & Auth
    APP_SECRET: str = "pact-super-secret-key-change-in-production"
    OTP_MODE: str = "dev"
    DEV_OTP: str = "123456"
    OTP_EXPIRE_SECONDS: int = 600  # 10 minutes
    OTP_MAX_ATTEMPTS: int = 3
    OTP_RATE_LIMIT_COOLDOWN_SECONDS: int = 60  # Minimum seconds between OTP requests per phone
    OTP_RATE_LIMIT_MAX_PER_HOUR: int = 5

    # Session & Cookie Management
    SESSION_COOKIE_NAME: str = "pact_session"
    SESSION_MAX_AGE_DAYS: int = 7
    SESSION_COOKIE_SECURE: bool = False
    SESSION_COOKIE_SAMESITE: str = "lax"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    EXTRA_ORIGINS: str = ""  # Comma-separated additional allowed origins for prod

    # Logging
    LOG_LEVEL: str = "INFO"

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
