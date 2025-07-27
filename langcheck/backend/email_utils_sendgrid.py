import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, From, To, Subject, PlainTextContent, HtmlContent
import logging
from config import settings
import secrets
import string

logger = logging.getLogger(__name__)

class SendGridEmailService:
    def __init__(self):
        # SendGrid API 키는 환경변수에서 가져옴
        self.api_key = getattr(settings, 'SENDGRID_API_KEY', None)
        self.from_email = getattr(settings, 'FROM_EMAIL', 'duwlstmd@gmail.com')
        
        if not self.api_key:
            logger.error("SENDGRID_API_KEY가 설정되지 않았습니다.")
            raise ValueError("SENDGRID_API_KEY가 필요합니다.")
        
        self.sg = SendGridAPIClient(api_key=self.api_key)
    
    def send_email(self, to_email: str, subject: str, body: str, is_html: bool = False):
        """SendGrid를 사용한 이메일 발송"""
        try:
            # 이메일 객체 생성
            message = Mail(
                from_email=From(self.from_email),
                to_emails=To(to_email),
                subject=Subject(subject)
            )
            
            # HTML 또는 일반 텍스트 설정
            if is_html:
                message.content = HtmlContent(body)
            else:
                message.content = PlainTextContent(body)
            
            # SendGrid API로 이메일 발송
            response = self.sg.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"SendGrid 이메일 발송 성공: {to_email}")
                return True
            else:
                logger.error(f"SendGrid 이메일 발송 실패: {to_email}, 상태코드: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"SendGrid 이메일 발송 오류: {to_email}, 오류: {str(e)}")
            return False
    
    def send_verification_email(self, to_email: str, verification_token: str):
        """이메일 인증 메일 발송"""
        verification_url = f"http://localhost:3000/verify-email/{verification_token}"
        
        subject = "✅ 이메일 인증을 완료해주세요 - LangCheck"
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
                .footer {{ margin-top: 20px; font-size: 12px; color: #666; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 LangCheck 이메일 인증</h1>
                </div>
                <div class="content">
                    <h2>안녕하세요!</h2>
                    <p>LangCheck 회원가입을 환영합니다! 🎉</p>
                    <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요:</p>
                    
                    <div style="text-align: center;">
                        <a href="{verification_url}" class="button">✅ 이메일 인증하기</a>
                    </div>
                    
                    <p><strong>또는 아래 링크를 복사하여 브라우저에 붙여넣기하세요:</strong></p>
                    <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all;">{verification_url}</p>
                    
                    <p>⏰ <strong>이 링크는 24시간 동안 유효합니다.</strong></p>
                    <p>만약 회원가입을 하지 않으셨다면, 이 메일을 무시해주세요.</p>
                </div>
                <div class="footer">
                    <p>© 2024 LangCheck. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, body, is_html=True)
    
    def send_password_reset_email(self, to_email: str, reset_token: str):
        """비밀번호 재설정 메일 발송"""
        reset_url = f"http://localhost:3000/reset-password/{reset_token}"
        
        subject = "🔑 비밀번호 재설정 요청 - LangCheck"
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
                .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0; }}
                .footer {{ margin-top: 20px; font-size: 12px; color: #666; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔑 비밀번호 재설정</h1>
                </div>
                <div class="content">
                    <h2>안녕하세요!</h2>
                    <p>LangCheck 계정의 비밀번호 재설정을 요청하셨습니다.</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="button">🔑 비밀번호 재설정하기</a>
                    </div>
                    
                    <p><strong>또는 아래 링크를 복사하여 브라우저에 붙여넣기하세요:</strong></p>
                    <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all;">{reset_url}</p>
                    
                    <div class="warning">
                        <p>⚠️ <strong>보안 알림:</strong></p>
                        <ul>
                            <li>이 링크는 <strong>1시간 동안만</strong> 유효합니다.</li>
                            <li>비밀번호 재설정을 요청하지 않으셨다면, 이 메일을 무시해주세요.</li>
                            <li>계정 보안을 위해 강력한 비밀번호를 사용해주세요.</li>
                        </ul>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2024 LangCheck. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, body, is_html=True)
    
    def send_temporary_password_email(self, to_email: str, temporary_password: str):
        """임시 비밀번호 발송"""
        subject = "🔐 임시 비밀번호 발급 - LangCheck"
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .password-box {{ background: #007bff; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; font-size: 18px; font-weight: bold; letter-spacing: 2px; }}
                .warning {{ background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 20px 0; }}
                .footer {{ margin-top: 20px; font-size: 12px; color: #666; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 임시 비밀번호</h1>
                </div>
                <div class="content">
                    <h2>안녕하세요!</h2>
                    <p>요청하신 LangCheck 계정의 임시 비밀번호를 발급해드립니다.</p>
                    
                    <div class="password-box">
                        🔑 임시 비밀번호: {temporary_password}
                    </div>
                    
                    <div class="warning">
                        <p>🚨 <strong>중요한 보안 사항:</strong></p>
                        <ul>
                            <li><strong>로그인 후 즉시 비밀번호를 변경</strong>해주세요.</li>
                            <li>임시 비밀번호는 <strong>24시간 후 자동 만료</strong>됩니다.</li>
                            <li>이 이메일을 다른 사람과 공유하지 마세요.</li>
                            <li>임시 비밀번호 사용 후 이 이메일을 삭제해주세요.</li>
                        </ul>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="http://localhost:3000" style="display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">🚀 로그인하러 가기</a>
                    </p>
                </div>
                <div class="footer">
                    <p>© 2024 LangCheck. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, body, is_html=True)


def generate_temporary_password(length: int = 10) -> str:
    """임시 비밀번호 생성"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# SendGrid 이메일 서비스 인스턴스
try:
    sendgrid_email_service = SendGridEmailService()
except Exception as e:
    logger.error(f"SendGrid 초기화 실패: {e}")
    sendgrid_email_service = None 