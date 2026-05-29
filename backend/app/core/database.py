from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Adjust sqlite specific settings if needed
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Obfuscate password for logging
safe_url = db_url
try:
    from urllib.parse import urlparse, urlunparse
    parsed = urlparse(db_url)
    if parsed.password:
        safe_url = parsed._replace(netloc=f"{parsed.username}:****@{parsed.hostname}:{parsed.port}").geturl()
except Exception:
    pass

print(f"\n[+] DATABASE SETUP: Initializing engine with URL: {safe_url}")

try:
    engine = create_engine(
        db_url, 
        connect_args=connect_args,
        pool_pre_ping=True
    )
    # Test connection immediately to catch errors early
    with engine.connect() as conn:
        print("[+] DATABASE SETUP: Successfully connected to the database!")
except Exception as e:
    import sys
    print("\n" + "="*80)
    print(" [!!!] DATABASE CONNECTION ERROR [!!!]")
    print(f" Failed to connect or initialize engine with URL: {safe_url}")
    print(f" Error Details: {str(e)}")
    print("="*80 + "\n")
    # Re-raise so the application fails to start but prints the banner above
    raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
