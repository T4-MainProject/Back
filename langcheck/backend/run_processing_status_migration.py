"""
processing_status 컬럼 확장 마이그레이션 실행 스크립트
"""
import asyncio
import asyncpg
from config import settings

async def run_migration():
    # 데이터베이스 연결 정보 (config.py에서 가져오기)
    # postgresql+asyncpg:// -> postgresql://로 변경
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    
    # 마이그레이션 SQL 파일 읽기
    with open('migrations/extend_processing_status.sql', 'r', encoding='utf-8') as f:
        migration_sql = f.read()
    
    # 데이터베이스 연결 및 실행
    conn = await asyncpg.connect(db_url)
    try:
        print("processing_status 컬럼 확장 마이그레이션을 실행합니다...")
        await conn.execute(migration_sql)
        print("✅ 마이그레이션이 완료되었습니다!")
        print("processing_status 컬럼이 VARCHAR(30)으로 확장되었습니다.")
    except Exception as e:
        print(f"❌ 마이그레이션 실행 중 오류 발생: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration()) 