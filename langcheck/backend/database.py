import logging
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import settings

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# .env 파일에서 데이터베이스 URL을 로드합니다.
# MySQL 비동기 드라이버인 aiomysql을 사용합니다.
# 예: DATABASE_URL="mysql+aiomysql://user:password@host:port/db_name"
DATABASE_URL = settings.DATABASE_URL

# 비동기 데이터베이스 엔진을 생성합니다.
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,         # 커넥션 풀의 기본 크기
    max_overflow=5,       # 풀 크기를 초과하여 생성할 수 있는 임시 연결 수
    pool_recycle=1800,    # 30분마다 커넥션을 재활용하여 연결 안정성 확보
    echo=False            # True로 설정 시 실행되는 SQL 쿼리를 로그로 출력
)

# 비동기 세션을 생성하기 위한 sessionmaker를 설정합니다.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

# 모델 클래스들이 상속받을 Base 클래스를 생성합니다.
Base = declarative_base()

# FastAPI 의존성 주입을 위한 get_db 함수
async def get_db() -> AsyncSession:
    """
    API 요청마다 데이터베이스 세션을 생성하고, 요청이 끝나면 세션을 닫는
    FastAPI 의존성 함수입니다.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# 애플리케이션 시작 시 테이블 생성 (필요 시 사용)
async def create_tables():
    async with engine.begin() as conn:
        # 모든 모델 테이블을 생성합니다.
        await conn.run_sync(Base.metadata.create_all)
    logger.info("데이터베이스 테이블이 성공적으로 생성되었습니다.")