from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    # Unused by the backend (frontend uses NEXT_PUBLIC_SUPABASE_ANON_KEY).
    # Optional so existing local/Railway .env files that still set it don't fail.
    supabase_anon_key: str | None = None
    cors_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,https://templeparties.com,https://temple-parties.vercel.app,https://tuparties.com,https://www.tuparties.com"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
