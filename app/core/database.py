from sqlalchemy import create_engine, Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

from app.core.config import settings
from app.core.utils import generate_uuid

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True
).execution_options(isolation_level="AUTOCOMMIT")

SessionLocal = sessionmaker(autoflush=True, bind=engine)

Base = declarative_base()

class BaseModelDB(Base):
    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    created_on = Column(DateTime, default=datetime.now)
    updated_on = Column(DateTime, default=datetime.now, onupdate=datetime.now)

def get_db():
    db = SessionLocal()
    try:
        yield db
        db.flush()
    finally:
        db.close()
