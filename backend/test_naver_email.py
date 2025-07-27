#!/usr/bin/env python3
"""
네이버 SMTP 이메일 발송 테스트 스크립트
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

def test_naver_smtp_connection():
    """네이버 SMTP 연결 테스트"""
    try:
        print("=" * 60)
        print("네이버 SMTP 연결 테스트")
        print("=" * 60)
        
        smtp_server = getattr(settings, 'NAVER_SMTP_SERVER', 'smtp.naver.com')
        smtp_port = getattr(settings, 'NAVER_SMTP_PORT', 587)
        smtp_username = getattr(settings, 'NAVER_SMTP_USERNAME', '')
        smtp_password = getattr(settings, 'NAVER_SMTP_PASSWORD', '')
        
        print(f"SMTP 서버: {smtp_server}")
        print(f"포트: {smtp_port}")
        print(f"사용자: {smtp_username}")
        
        if not smtp_username or not smtp_password:
            print("❌ 네이버 SMTP 설정이 완료되지 않았습니다.")
            print("다음을 .env 파일에 추가하세요:")
            print("NAVER_SMTP_USERNAME=네이버아이디@naver.com")
            print("NAVER_SMTP_PASSWORD=네이버비밀번호")
            print("NAVER_FROM_EMAIL=네이버아이디@naver.com")
            return False
        
        print("\n연결 시도 중...")
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.quit()
        
        print("✅ 네이버 SMTP 연결 성공!")
        return True
        
    except Exception as e:
        print(f"❌ 네이버 SMTP 연결 실패: {e}")
        print("\n🔧 해결 방법:")
        print("1. 네이버 계정 → 메일 → 환경설정 → POP3/IMAP 설정")
        print("2. 'POP3/IMAP 사용' 체크박스 활성화")
        print("3. .env 파일의 네이버 계정 정보 확인")
        return False

def test_naver_email_send():
    """네이버로 테스트 이메일 발송"""
    try:
        from email_utils_naver import naver_email_service
        
        print("\n" + "=" * 60)
        print("네이버 SMTP 이메일 발송 테스트")
        print("=" * 60)
        
        # 네이버 계정으로 테스트 (자기 자신에게 발송)
        test_email = getattr(settings, 'NAVER_FROM_EMAIL', '')
        
        if not test_email:
            print("❌ NAVER_FROM_EMAIL이 설정되지 않았습니다.")
            return False
        
        print(f"테스트 이메일 발송 대상: {test_email}")
        
        success = naver_email_service.send_email(
            to_email=test_email,
            subject="🧪 네이버 SMTP 테스트 - LangCheck",
            body="""
            <html>
            <body style="font-family: 'Malgun Gothic', Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 10px;">
                    <h1 style="color: #1ec997; text-align: center;">🚀 네이버 SMTP 테스트 성공!</h1>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="color: #2c3e50;">📧 이메일 발송 테스트 완료</h2>
                        <p><strong>네이버 SMTP 서버를 통한 이메일 발송이 정상적으로 작동합니다!</strong></p>
                        
                        <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;">
                            <p style="margin: 0;"><strong>✅ 테스트 결과:</strong></p>
                            <ul>
                                <li>네이버 SMTP 연결: 성공</li>
                                <li>이메일 발송: 성공</li>
                                <li>HTML 렌더링: 성공</li>
                                <li>한글 인코딩: 성공</li>
                            </ul>
                        </div>
                        
                        <p>이제 다음 이메일 서비스로 발송 테스트를 해보세요:</p>
                        <ul>
                            <li>📧 <strong>네이버</strong> (naver.com) ✅</li>
                            <li>📧 <strong>다음</strong> (daum.net, kakao.com)</li>
                            <li>📧 <strong>Gmail</strong> (gmail.com)</li>
                            <li>📧 <strong>Outlook</strong> (outlook.com, hotmail.com)</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #6c757d; font-size: 14px;">
                            © 2024 LangCheck | 네이버 SMTP 테스트<br>
                            시간: {import datetime; datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """,
            is_html=True
        )
        
        if success:
            print("✅ 네이버 SMTP 이메일 발송 성공!")
            print(f"   → {test_email}로 테스트 이메일이 발송되었습니다.")
            print("   → 네이버 메일함을 확인해보세요!")
        else:
            print("❌ 네이버 SMTP 이메일 발송 실패!")
            
        return success
        
    except Exception as e:
        print(f"❌ 네이버 이메일 발송 테스트 중 오류: {e}")
        return False

def test_verification_email():
    """인증 이메일 발송 테스트"""
    try:
        from email_utils_naver import naver_email_service
        
        print("\n" + "=" * 60)
        print("네이버 SMTP 인증 이메일 테스트")
        print("=" * 60)
        
        test_email = getattr(settings, 'NAVER_FROM_EMAIL', '')
        test_token = "test_verification_token_123456"
        
        print(f"인증 이메일 발송 대상: {test_email}")
        
        success = naver_email_service.send_verification_email(test_email, test_token)
        
        if success:
            print("✅ 인증 이메일 발송 성공!")
            print("   → 네이버 메일함에서 아름다운 인증 이메일을 확인해보세요!")
        else:
            print("❌ 인증 이메일 발송 실패!")
            
        return success
        
    except Exception as e:
        print(f"❌ 인증 이메일 테스트 중 오류: {e}")
        return False

if __name__ == "__main__":
    print("🚀 네이버 SMTP 이메일 서비스 테스트 시작")
    
    # 1. SMTP 연결 테스트
    if not test_naver_smtp_connection():
        print("\n❌ SMTP 연결 실패로 인해 테스트를 중단합니다.")
        print("\n📋 설정 방법:")
        print("1. 네이버 → 메일 → 환경설정 → POP3/IMAP 설정 활성화")
        print("2. .env 파일에 네이버 계정 정보 추가")
        sys.exit(1)
    
    # 2. 기본 이메일 발송 테스트
    test_naver_email_send()
    
    # 3. 인증 이메일 발송 테스트
    test_verification_email()
    
    print("\n" + "=" * 60)
    print("🎉 네이버 SMTP 테스트 완료!")
    print("=" * 60)
    print("이제 다른 이메일 서비스(다음, Gmail 등)로도 발송 테스트를 해보세요!") 