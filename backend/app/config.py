from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://modelisys:modelisys@db:5432/modelisys"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # App
    app_name: str = "Modelisys API"
    debug: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
