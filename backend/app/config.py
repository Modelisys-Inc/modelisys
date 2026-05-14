import os
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://modelisys:modelisys@db:5432/modelisys"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS - comma-separated list of origins
    cors_origins: str = "http://localhost:3000"

    # App
    app_name: str = "Modelisys API"
    debug: bool = False
    environment: str = "development"  # development, staging, production

    # Rate limiting
    rate_limit_per_minute: int = 60

    # Sentry (optional)
    sentry_dsn: str | None = None

    # Email (optional)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    from_email: str = "noreply@modelisys.com"

    # Frontend URL (for password reset links)
    frontend_url: str = "http://localhost:3000"

    # QuickBooks integration
    intuit_client_id: str = ""
    intuit_client_secret: str = ""
    intuit_environment: str = "sandbox"  # sandbox | production
    intuit_redirect_uri: str = "http://localhost:8000/api/quickbooks/callback"
    qbo_token_encryption_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production" and v == "change-me-in-production":
            raise ValueError(
                "JWT_SECRET_KEY must be set to a secure value in production. "
                "Generate one with: openssl rand -hex 32"
            )
        if len(v) < 32 and env == "production":
            raise ValueError(
                "JWT_SECRET_KEY must be at least 32 characters in production"
            )
        return v

    @field_validator("qbo_token_encryption_key")
    @classmethod
    def validate_qbo_key(cls, v: str) -> str:
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production" and not v:
            raise ValueError(
                "QBO_TOKEN_ENCRYPTION_KEY must be set in production. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def intuit_oauth_base(self) -> str:
        return "https://oauth.platform.intuit.com"

    @property
    def intuit_api_base(self) -> str:
        if self.intuit_environment == "production":
            return "https://quickbooks.api.intuit.com"
        return "https://sandbox-quickbooks.api.intuit.com"

    @property
    def intuit_authorize_base(self) -> str:
        return "https://appcenter.intuit.com/connect/oauth2"


settings = Settings()
