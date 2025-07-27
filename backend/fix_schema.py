import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from config import settings

async def apply_schema_fix():
    """'exam_uploads' 테이블에 누락된 컬럼을 추가합니다."""
    print("🔧 스키마 수정 시작: 'exam_uploads' 테이블에 컬럼 추가")
    
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    async with engine.connect() as conn:
        try:
            # updated_at 컬럼 추가
            print("   -> 'updated_at' 컬럼 추가 시도...")
            await conn.execute(text("ALTER TABLE exam_uploads ADD COLUMN updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)"))
            print("      ✅ 'updated_at' 컬럼 추가 완료.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("      ⚠️  'updated_at' 컬럼이 이미 존재합니다. 건너뜁니다.")
            else:
                print(f"      ❌ 'updated_at' 컬럼 추가 실패: {e}")

        try:
            # error_message 컬럼 추가
            print("   -> 'error_message' 컬럼 추가 시도...")
            await conn.execute(text("ALTER TABLE exam_uploads ADD COLUMN error_message TEXT NULL"))
            print("      ✅ 'error_message' 컬럼 추가 완료.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("      ⚠️  'error_message' 컬럼이 이미 존재합니다. 건너뜁니다.")
            else:
                print(f"      ❌ 'error_message' 컬럼 추가 실패: {e}")

        await conn.commit()

    await engine.dispose()
    print("🎉 스키마 수정 완료!")

if __name__ == "__main__":
    asyncio.run(apply_schema_fix())
