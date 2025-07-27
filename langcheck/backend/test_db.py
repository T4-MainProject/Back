import asyncio
import os
from database import engine, AsyncSessionLocal
from sqlalchemy import text

async def test_database_connection():
    """데이터베이스 연결을 테스트합니다."""
    print("🔍 데이터베이스 연결 테스트 시작...")
    
    try:
        # 1. 엔진 연결 테스트
        print("1️⃣ 엔진 연결 테스트...")
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            row = result.fetchone()
            print(f"✅ 엔진 연결 성공: {row[0]}")
        
        # 2. 세션 연결 테스트
        print("2️⃣ 세션 연결 테스트...")
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT current_database(), current_user"))
            row = result.fetchone()
            print(f"✅ 세션 연결 성공: DB={row[0]}, User={row[1]}")
        
        # 3. 환경변수 확인
        print("3️⃣ 환경변수 확인...")
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            # 민감한 정보 숨기기
            safe_url = db_url.split("@")[1] if "@" in db_url else "설정됨"
            print(f"✅ DATABASE_URL: postgresql+asyncpg://***@{safe_url}")
        else:
            print("❌ DATABASE_URL 환경변수가 설정되지 않음")
        
        print("🎉 모든 데이터베이스 테스트 통과!")
        return True
        
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {str(e)}")
        print(f"🔍 오류 타입: {type(e).__name__}")
        return False

if __name__ == "__main__":
    asyncio.run(test_database_connection()) 