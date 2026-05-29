import os
from pydantic_settings import BaseSettings
from cryptography.fernet import Fernet

class Settings(BaseSettings):
    PROJECT_NAME: str = "QuantFlow API"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("JWT_SECRET", "supersecretjwttokenkeyforlocaldevelopment1234567890!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # DB & Queue
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./quantflow.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Webhooks
    WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET", "quantflow_webhook_secret_key_123")
    
    # Encryption Key for API keys (Fernet requires a 32-byte url-safe base64-encoded key)
    # If not provided, we generate a persistent one or default to a stable development one.
    ENCRYPTION_KEY: str = os.getenv(
        "ENCRYPTION_KEY", 
        "L7Gj2Z1h9z3-b9F1s5D8K0J2e3f4g5h6i7j8k9l0m1o="
    )
    
    # AI Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    class Config:
        case_sensitive = True

settings = Settings()
