from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "dev"
    API_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "PACT API"

    # Database URLs (PostgreSQL 16)
    DATABASE_URL: str = "postgresql+psycopg://pactuser:pactpassword@localhost:5432/pact_dev"
    TEST_DATABASE_URL: str = "postgresql+psycopg://pactuser:pactpassword@localhost:5432/pact_test"

    # Timezone & Security
    TIMEZONE: str = "Asia/Kolkata"
    APP_SECRET: str = "pact-super-secret-key-change-in-production"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
