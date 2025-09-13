import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=True, future=True)

async_session_maker = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with async_session_maker() as session:
        yield session
