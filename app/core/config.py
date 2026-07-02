import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve path to .env in the app directory or workspace root
current_dir = os.path.dirname(os.path.abspath(__file__))
env_file_path = os.path.join(current_dir, "..", "..", ".env")

load_dotenv(env_file_path)
load_dotenv(".env")


class Settings(BaseSettings):
    PROJECT_NAME: str
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    GROQ_API_KEY: str
    BASE_URL: str
    RECAPTCHA_API_KEY: str
    RECAPTCHA_PROJECT_ID: str
    RECAPTCHA_SITE_KEY: str

    model_config = SettingsConfigDict(extra="ignore")


settings = Settings()
