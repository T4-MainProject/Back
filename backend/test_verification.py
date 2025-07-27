import asyncio
import requests
from database import engine
from sqlalchemy import text

async def test_verification():
    # 데이터베이스에서 최신 토큰 확인
    async with engine.begin() as conn:
        result = await conn.execute(text('SELECT * FROM email_verification_tokens ORDER BY created_at DESC LIMIT 1'))
        token_row = result.fetchone()
        
        if not token_row:
            print("❌ 인증 토큰이 없습니다.")
            return
        
        token = token_row[2]  # token 필드
        user_id = token_row[1]  # user_id 필드
        expires_at = token_row[3]  # expires_at 필드
        is_used = token_row[4]  # is_used 필드
        
        print(f"🔍 찾은 토큰: {token}")
        print(f"👤 사용자 ID: {user_id}")
        print(f"⏰ 만료 시간: {expires_at}")
        print(f"✅ 사용 여부: {is_used}")
        
        # 사용자 정보 확인
        result = await conn.execute(text(f'SELECT email, name, is_verified FROM users WHERE id = "{user_id}"'))
        user_row = result.fetchone()
        
        if user_row:
            print(f"📧 이메일: {user_row[0]}")
            print(f"👤 이름: {user_row[1]}")
            print(f"✅ 인증 상태: {user_row[2]}")
        
        # API 테스트
        print(f"\n🔗 테스트 URL: http://localhost:8000/api/v1/auth/verify-email/{token}")
        
        try:
            response = requests.get(f"http://localhost:8000/api/v1/auth/verify-email/{token}")
            print(f"📡 API 응답 상태: {response.status_code}")
            print(f"📄 응답 내용: {response.text}")
        except Exception as e:
            print(f"❌ API 요청 실패: {e}")

if __name__ == "__main__":
    asyncio.run(test_verification()) 