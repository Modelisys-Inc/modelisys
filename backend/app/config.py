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
    cors_origins: list[str] = ["http://localhost:3000"]

    # App
    app_name: str = "Modelisys API"
    debug: bool = False
    environment: str = "development"  # development, staging, production

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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
