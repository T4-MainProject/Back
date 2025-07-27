import asyncio
from database import engine
from sqlalchemy import text

async def check_database():
    try:
        async with engine.begin() as conn:
            print("✅ 데이터베이스 연결 성공")
            
            # 테이블 목록 확인
            result = await conn.execute(text("SHOW TABLES"))
            tables = result.fetchall()
            print(f"📋 테이블 목록: {[table[0] for table in tables]}")
            
            # 사용자 테이블 확인
            result = await conn.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            print(f"👥 사용자 수: {user_count}")
            
            # 이메일 인증 토큰 테이블 확인
            result = await conn.execute(text("SELECT COUNT(*) FROM email_verification_tokens"))
            token_count = result.scalar()
            print(f"🔑 인증 토큰 수: {token_count}")
            
            if token_count > 0:
                # 최신 토큰 정보
                result = await conn.execute(text("SELECT * FROM email_verification_tokens ORDER BY created_at DESC LIMIT 1"))
                token = result.fetchone()
                print(f"🔍 최신 토큰: {token}")
                
                # 해당 사용자 정보
                user_id = token[1]
                result = await conn.execute(text(f"SELECT email, name, is_verified FROM users WHERE id = '{user_id}'"))
                user = result.fetchone()
                if user:
                    print(f"👤 사용자: {user}")
            
    except Exception as e:
        print(f"❌ 데이터베이스 오류: {e}")

if __name__ == "__main__":
    asyncio.run(check_database()) 