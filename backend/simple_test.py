import asyncio
from config import settings

async def test():
    print("🔍 설정 확인:")
    print(f"DATABASE_URL: {settings.DATABASE_URL}")
    
    try:
        from database import engine
        print("✅ 엔진 생성 성공")
        
        async with engine.begin() as conn:
            print("✅ 데이터베이스 연결 성공")
            result = await conn.execute("SELECT 1")
            print("✅ 쿼리 실행 성공")
            
    except Exception as e:
        print(f"❌ 오류: {e}")

if __name__ == "__main__":
    asyncio.run(test()) 