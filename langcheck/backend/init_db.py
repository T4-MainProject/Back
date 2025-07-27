#!/usr/bin/env python3
"""
데이터베이스 초기화 스크립트
MySQL 데이터베이스를 완전히 초기화하고 테이블을 다시 생성합니다.
"""

import asyncio
import os
import sys
from pathlib import Path

# 프로젝트 루트 디렉토리를 Python 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from database import engine, Base
from models import *  # 모든 모델을 import
from config import settings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.exc import ProgrammingError

async def init_database():
    """데이터베이스를 완전히 초기화하고 테이블을 생성합니다."""
    
    db_url = settings.DATABASE_URL
    db_name = db_url.split('/')[-1]
    server_url = db_url.rsplit('/', 1)[0]

    # Connect to the server without specifying a database
    server_engine = create_async_engine(server_url, echo=False)

    print(f"🔥 Dropping and recreating database '{db_name}'...")
    async with server_engine.connect() as conn:
        await conn.execute(text("COMMIT"))  # Ensure no transaction is active
        try:
            await conn.execute(text(f"DROP DATABASE {db_name}"))
            print(f"   ✅ Database '{db_name}' dropped.")
        except ProgrammingError as e:
            print(f"   ⚠️  Could not drop database (it might not exist): {e}")
        
        await conn.execute(text(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
        print(f"   ✅ Database '{db_name}' created.")
    await server_engine.dispose()
    
    print("🗄️  데이터베이스 초기화 시작...")
    print("=" * 60)
    
    try:
        # 1. 기존 테이블 삭제
        print("🧹 기존 테이블 삭제 중...")
        async with engine.begin() as conn:
            # 외래 키 제약 조건 비활성화
            await conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            
            # 모든 테이블 삭제 (현재 모델 기준)
            tables_to_drop = [
                'similar_question_attempts',
                'similar_questions', 
                'wrong_answer_notes',
                'question_answers',
                'exam_results',
                'exam_uploads',
                'notifications',
                'password_reset_tokens',
                'email_verification_tokens',
                'users'
            ]
            
            for table in tables_to_drop:
                try:
                    await conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                    print(f"   ✅ {table} 테이블 삭제 완료")
                except Exception as e:
                    print(f"   ⚠️  {table} 테이블 삭제 실패: {e}")
            
            # 외래 키 제약 조건 다시 활성화
            await conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        
        print("✅ 기존 테이블 삭제 완료")
        
        # 2. 새 테이블 생성
        print("\n🏗️  새 테이블 생성 중...")
        async with engine.begin() as conn:
            # SQLAlchemy 모델 기반으로 테이블 생성
            await conn.run_sync(Base.metadata.create_all)
        
        # 3. 누락된 컬럼들 추가 (기존 데이터가 있는 경우)
        print("\n🔧 누락된 컬럼들 추가 중...")
        async with engine.begin() as conn:
            # exam_results 테이블에 누락된 컬럼들 추가
            try:
                await conn.execute(text("""
                    ALTER TABLE exam_results 
                    ADD COLUMN IF NOT EXISTS yolo_result JSON,
                    ADD COLUMN IF NOT EXISTS vision_result JSON,
                    ADD COLUMN IF NOT EXISTS vision_confidence_avg DECIMAL(4,3),
                    ADD COLUMN IF NOT EXISTS vision_questions_detected INTEGER,
                    ADD COLUMN IF NOT EXISTS vision_analysis_quality VARCHAR(20)
                """))
                print("   ✅ exam_results 컬럼 추가 완료")
            except Exception as e:
                print(f"   ⚠️  exam_results 컬럼 추가 실패: {e}")
            
            # exam_uploads 테이블에 누락된 컬럼들 추가
            try:
                await conn.execute(text("""
                    ALTER TABLE exam_uploads 
                    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS error_message TEXT
                """))
                print("   ✅ exam_uploads 컬럼 추가 완료")
            except Exception as e:
                print(f"   ⚠️  exam_uploads 컬럼 추가 실패: {e}")
            
            # question_answers 테이블에 누락된 컬럼들 추가
            try:
                await conn.execute(text("""
                    ALTER TABLE question_answers 
                    ADD COLUMN IF NOT EXISTS detection_method VARCHAR(50),
                    ADD COLUMN IF NOT EXISTS vision_text TEXT,
                    ADD COLUMN IF NOT EXISTS yolo_box_coordinates JSON
                """))
                print("   ✅ question_answers 컬럼 추가 완료")
            except Exception as e:
                print(f"   ⚠️  question_answers 컬럼 추가 실패: {e}")
            
            # 기존 데이터에 대한 기본값 설정
            try:
                await conn.execute(text("""
                    UPDATE exam_results 
                    SET 
                        yolo_result = COALESCE(yolo_result, '{}'),
                        vision_result = COALESCE(vision_result, '{}'),
                        vision_confidence_avg = COALESCE(vision_confidence_avg, 0.0),
                        vision_questions_detected = COALESCE(vision_questions_detected, 0),
                        vision_analysis_quality = COALESCE(vision_analysis_quality, 'unknown')
                    WHERE yolo_result IS NULL OR vision_result IS NULL
                """))
                print("   ✅ 기본값 설정 완료")
            except Exception as e:
                print(f"   ⚠️  기본값 설정 실패: {e}")
        
        print("✅ 새 테이블 생성 완료")
        
        # 4. 초기 데이터 확인
        print("\n📊 테이블 생성 확인...")
        async with engine.begin() as conn:
            result = await conn.execute(text("SHOW TABLES"))
            tables = result.fetchall()
            
            print(f"   📋 생성된 테이블 수: {len(tables)}")
            for table in tables:
                print(f"   - {table[0]}")
        
        print("\n🎉 데이터베이스 초기화 완료!")
        print("=" * 60)
        
        # 5. 인덱스 생성 (성능 향상)
        print("\n🚀 인덱스 생성 중...")
        async with engine.begin() as conn:
            try:
                await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id)"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_question_answers_exam_result_id ON question_answers(exam_result_id)"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_exam_uploads_user_id ON exam_uploads(user_id)"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"))
                print("   ✅ 인덱스 생성 완료")
            except Exception as e:
                print(f"   ⚠️  인덱스 생성 실패: {e}")
        
        print("\n🎉 모든 작업 완료!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 데이터베이스 초기화 실패: {e}")
        import traceback
        print(f"🔍 상세 오류: {traceback.format_exc()}")
        return False
    
    return True

async def reset_database():
    """데이터베이스를 완전히 리셋합니다."""
    
    print("🔄 데이터베이스 완전 리셋 시작...")
    print("⚠️  경고: 이 작업은 모든 데이터를 삭제합니다!")
    
    # 사용자 확인
    confirm = input("\n정말로 데이터베이스를 완전히 리셋하시겠습니까? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ 작업이 취소되었습니다.")
        return False
    
    return await init_database()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="데이터베이스 초기화 도구")
    parser.add_argument("--reset", action="store_true", help="데이터베이스를 완전히 리셋")
    parser.add_argument("--init", action="store_true", help="테이블만 생성 (기존 데이터 유지)")
    
    args = parser.parse_args()
    
    if args.reset:
        success = asyncio.run(reset_database())
    elif args.init:
        success = asyncio.run(init_database())
    else:
        print("사용법:")
        print("  python init_db.py --init    # 테이블만 생성")
        print("  python init_db.py --reset   # 완전 리셋")
        success = False
    
    sys.exit(0 if success else 1) 