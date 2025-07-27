import asyncio
from database import engine
from sqlalchemy import text

async def check_tokens():
    async with engine.begin() as conn:
        # 이메일 인증 토큰 확인
        result = await conn.execute(text('SELECT * FROM email_verification_tokens ORDER BY created_at DESC LIMIT 5'))
        print('=== 이메일 인증 토큰 목록 ===')
        for row in result:
            print(f"ID: {row[0]}")
            print(f"User ID: {row[1]}")
            print(f"Token: {row[2]}")
            print(f"Expires: {row[3]}")
            print(f"Is Used: {row[4]}")
            print(f"Created: {row[5]}")
            print('---')
        
        # 사용자 테이블 확인
        result = await conn.execute(text('SELECT id, email, name, is_verified FROM users ORDER BY created_at DESC LIMIT 5'))
        print('=== 사용자 목록 ===')
        for row in result:
            print(f"ID: {row[0]}")
            print(f"Email: {row[1]}")
            print(f"Name: {row[2]}")
            print(f"Is Verified: {row[3]}")
            print('---')

if __name__ == "__main__":
    asyncio.run(check_tokens()) 