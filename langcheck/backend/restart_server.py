#!/usr/bin/env python3
"""
백엔드 서버 재시작 스크립트
"""
import os
import sys
import time
import subprocess
import psutil
import asyncio
from sqlalchemy import text

async def check_db_connection():
    """데이터베이스 연결 상태 확인"""
    try:
        from database import engine
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            return True
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        return False

def kill_existing_processes():
    """기존 파이썬 프로세스 종료"""
    print("🔍 기존 백엔드 프로세스 확인 중...")
    
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if proc.info['name'] == 'python.exe' or proc.info['name'] == 'python':
                cmdline = ' '.join(proc.info['cmdline'] or [])
                if 'uvicorn' in cmdline and 'main:app' in cmdline:
                    print(f"🛑 백엔드 프로세스 종료: PID {proc.info['pid']}")
                    proc.terminate()
                    proc.wait(timeout=5)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired):
            pass
    
    time.sleep(2)

def start_server():
    """새 서버 시작"""
    print("🚀 새 백엔드 서버 시작 중...")
    
    # 환경 변수 설정
    env = os.environ.copy()
    env['PYTHONPATH'] = os.getcwd()
    
    # uvicorn 명령어
    cmd = [
        sys.executable, "-m", "uvicorn", 
        "main:app", 
        "--host", "0.0.0.0", 
        "--port", "8000", 
        "--reload",
        "--log-level", "info"
    ]
    
    # 서버 시작
    process = subprocess.Popen(
        cmd,
        cwd=os.getcwd(),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    # 서버 시작 확인
    print("⏳ 서버 시작 대기 중...")
    time.sleep(5)
    
    if process.poll() is None:
        print("✅ 백엔드 서버가 성공적으로 시작되었습니다!")
        print("📍 서버 주소: http://localhost:8000")
        print("📖 API 문서: http://localhost:8000/docs")
        return process
    else:
        print("❌ 서버 시작 실패")
        return None

async def main():
    """메인 함수"""
    print("=" * 50)
    print("🔄 LangCheck 백엔드 서버 재시작")
    print("=" * 50)
    
    # 1. 기존 프로세스 종료
    kill_existing_processes()
    
    # 2. 데이터베이스 연결 확인
    print("🔗 데이터베이스 연결 상태 확인 중...")
    if await check_db_connection():
        print("✅ 데이터베이스 연결 정상")
    else:
        print("⚠️ 데이터베이스 연결에 문제가 있지만 서버를 시작합니다.")
    
    # 3. 새 서버 시작
    process = start_server()
    
    if process:
        print("\n📊 서버 로그:")
        print("-" * 30)
        try:
            # 첫 몇 줄의 로그 출력
            if process.stdout:
                for i, line in enumerate(process.stdout):
                    if i > 20:  # 처음 20줄만 출력
                        break
                    print(line.strip())
        except KeyboardInterrupt:
            print("\n🛑 재시작 스크립트 종료")
            process.terminate()

if __name__ == "__main__":
    asyncio.run(main()) 