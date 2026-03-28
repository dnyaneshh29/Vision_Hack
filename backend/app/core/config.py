from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import List
from urllib.parse import quote_plus


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Raw DB credentials (used to build URL safely)
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "flowstate_os"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"

    # Can also be set directly; if set it overrides the individual fields
    DATABASE_URL: str = ""

    SECRET_KEY: str = "change-me-in-production-use-256-bit-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5174"
    ENVIRONMENT: str = "development"

    @model_validator(mode="after")
    def build_database_url(self) -> "Settings":
        if not self.DATABASE_URL:
            pw = quote_plus(self.DB_PASSWORD)
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{self.DB_USER}:{pw}"
                f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            )
        return self

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()
