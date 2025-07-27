import asyncio
import asyncpg
from config import settings

async def run_column_migration():
    """답안 컬럼 크기 확장 마이그레이션 실행"""
    conn = await asyncpg.connect(settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://'))
    
    try:
        # 마이그레이션 파일 읽기
        with open('migrations/extend_answer_columns.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
        
        # 주석 제거하고 실제 실행할 SQL만 추출
        sql_lines = [line.strip() for line in sql.split('\n') if line.strip() and not line.strip().startswith('--')]
        migration_sql = '\n'.join(sql_lines)
        
        print("🔧 답안 컬럼 크기 확장 마이그레이션 시작...")
        print(f"실행할 SQL:\n{migration_sql}")
        
        # 마이그레이션 실행
        await conn.execute(migration_sql)
        
        # 결과 확인
        result = await conn.fetch("""
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'question_answers' 
            AND column_name IN ('user_answer', 'correct_answer')
            ORDER BY column_name;
        """)
        
        print("\n✅ 마이그레이션 완료! 현재 컬럼 정보:")
        for row in result:
            print(f"  - {row['column_name']}: {row['data_type']}({row['character_maximum_length']})")
            
    except Exception as e:
        print(f"❌ 마이그레이션 실패: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_column_migration()) 