import asyncio
from database import get_pool_status, dispose_engine

async def check_and_reset_pool():
    """연결 풀 상태를 확인하고 필요시 초기화합니다."""
    print("🔍 연결 풀 상태 확인...")
    
    # 현재 상태 확인
    status = get_pool_status()
    print(f"📊 현재 연결 풀 상태:")
    print(f"   - 풀 크기: {status['pool_size']}")
    print(f"   - 사용 중: {status['checked_out']}")
    print(f"   - 사용 가능: {status['checked_in']}")
    print(f"   - 오버플로우: {status['overflow']}")
    
    # 연결이 모두 사용 중이면 초기화
    if status['checked_out'] > 0:
        print("🔄 연결 풀 초기화 중...")
        await dispose_engine()
        print("✅ 연결 풀 초기화 완료")
    else:
        print("✅ 연결 풀 상태 정상")

if __name__ == "__main__":
    asyncio.run(check_and_reset_pool()) 