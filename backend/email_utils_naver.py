import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from config import settings
import secrets
import string

logger = logging.getLogger(__name__)

class NaverEmailService:
    def __init__(self):
        # 네이버 SMTP 설정
        self.smtp_server = getattr(settings, 'NAVER_SMTP_SERVER', 'smtp.naver.com')
        self.smtp_port = getattr(settings, 'NAVER_SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'NAVER_SMTP_USERNAME', '')
        self.smtp_password = getattr(settings, 'NAVER_SMTP_PASSWORD', '')
        self.from_email = getattr(settings, 'NAVER_FROM_EMAIL', '')
        
        if not self.smtp_username or not self.smtp_password:
            logger.error("네이버 SMTP 설정이 완료되지 않았습니다.")
            raise ValueError("네이버 SMTP 사용자명과 패스워드가 필요합니다.")
    
    def send_email(self, to_email: str, subject: str, body: str, is_html: bool = False):
        """네이버 SMTP를 사용한 이메일 발송 (디버깅용 print 추가)"""
        try:
            print(f"[DEBUG] send_email 진입: to={to_email}, subject={subject}")
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # HTML 또는 일반 텍스트 설정
            if is_html:
                msg.attach(MIMEText(body, 'html', 'utf-8'))
            else:
                msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            print(f"[DEBUG] SMTP 서버 연결 시도: {self.smtp_server}:{self.smtp_port}")
            if self.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            print("[DEBUG] SMTP 로그인 시도")
            server.login(self.smtp_username, self.smtp_password)
            print("[DEBUG] SMTP 로그인 성공")
            text = msg.as_string()
            print("[DEBUG] 이메일 발송 시도")
            server.sendmail(self.from_email, to_email, text)
            print("[DEBUG] 이메일 발송 성공")
            server.quit()
            print("[DEBUG] SMTP 연결 종료")
            
            logger.info(f"네이버 SMTP 이메일 발송 성공: {to_email}")
            return True
            
        except Exception as e:
            print(f"[DEBUG] 이메일 발송 예외 발생: {e}")
            logger.error(f"네이버 SMTP 이메일 발송 실패: {to_email}, 오류: {str(e)}", exc_info=True)
            return False
    
    def send_verification_email(self, to_email: str, verification_token: str):
        print(f"[DEBUG] send_verification_email 호출됨: to_email={to_email}, token={verification_token}")
        verification_url = f"{settings.BASE_URL}/verify-email/{verification_token}"
        
        subject = "✅ 이메일 인증을 완료해주세요 - LangCheck"
        body = f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
                .header {{ 
                    background: linear-gradient(135deg, #1ec997 0%, #03dac6 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                    border-radius: 8px 8px 0 0; 
                }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: bold; }}
                .content {{ 
                    background: #f8f9fa; 
                    padding: 40px 30px; 
                    border-radius: 0 0 8px 8px; 
                }}
                .welcome-text {{ font-size: 18px; color: #2c3e50; margin-bottom: 20px; }}
                .button-container {{ text-align: center; margin: 30px 0; }}
                .verify-button {{ 
                    display: inline-block; 
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
                    transition: all 0.3s ease;
                }}
                .verify-button:hover {{ 
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
                }}
                .link-box {{ 
                    background: #e9ecef; 
                    padding: 15px; 
                    border-radius: 8px; 
                    margin: 20px 0;
                    border-left: 4px solid #007bff;
                }}
                .link-text {{ 
                    font-family: 'Courier New', monospace;
                    word-break: break-all; 
                    font-size: 12px;
                    color: #495057;
                }}
                .warning-box {{ 
                    background: #fff3cd; 
                    border: 1px solid #ffeaa7; 
                    border-radius: 6px; 
                    padding: 15px; 
                    margin: 25px 0;
                }}
                .footer {{ 
                    margin-top: 30px; 
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                    font-size: 12px; 
                    color: #6c757d; 
                    text-align: center; 
                }}
                .logo {{ font-size: 28px; margin-bottom: 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🚀</div>
                    <h1>LangCheck 이메일 인증</h1>
                </div>
                <div class="content">
                    <div class="welcome-text">
                        <strong>안녕하세요!</strong> 🎉<br>
                        LangCheck 회원가입을 진심으로 환영합니다!
                    </div>
                    
                    <p>계정 보안을 위해 이메일 인증이 필요합니다.</p>
                    <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요:</p>
                    
                    <div class="button-container">
                        <a href="{verification_url}" class="verify-button">
                            ✅ 이메일 인증하기
                        </a>
                    </div>
                    
                    <p><strong>버튼이 작동하지 않는 경우:</strong></p>
                    <div class="link-box">
                        <p style="margin: 0; font-weight: bold;">아래 링크를 복사하여 브라우저에 붙여넣기하세요:</p>
                        <div class="link-text">{verification_url}</div>
                    </div>
                    
                    <div class="warning-box">
                        <p style="margin: 0;"><strong>⏰ 중요:</strong></p>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>이 링크는 <strong>24시간 동안</strong> 유효합니다.</li>
                            <li>회원가입을 하지 않으셨다면, 이 메일을 무시해주세요.</li>
                            <li>보안을 위해 링크를 다른 사람과 공유하지 마세요.</li>
                        </ul>
                    </div>
                    
                    <p style="margin-top: 30px;">
                        궁금한 점이 있으시면 언제든 문의해주세요!<br>
                        <strong>LangCheck 팀 드림</strong> ❤️
                    </p>
                </div>
                <div class="footer">
                    <p>© 2024 LangCheck. All rights reserved.</p>
                    <p>이 메일은 자동으로 발송된 메일입니다.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, body, is_html=True)
    
    def send_password_reset_email(self, to_email: str, reset_token: str):
        """비밀번호 재설정 메일 발송"""
        reset_url = f"{settings.BASE_URL}/reset-password/{reset_token}"
        
        subject = "🔑 비밀번호 재설정 요청 - LangCheck"
        body = f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
                .header {{ 
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                    border-radius: 8px 8px 0 0; 
                }}
                .content {{ background: #f8f9fa; padding: 40px 30px; border-radius: 0 0 8px 8px; }}
                .reset-button {{ 
                    display: inline-block; 
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
                }}
                .warning {{ 
                    background: #fff3cd; 
                    border: 1px solid #ffeaa7; 
                    border-radius: 6px; 
                    padding: 20px; 
                    margin: 25px 0; 
                }}
                .footer {{ 
                    margin-top: 30px; 
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                    font-size: 12px; 
                    color: #6c757d; 
                    text-align: center; 
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔑 비밀번호 재설정</h1>
                </div>
                <div class="content">
                    <h2 style="color: #2c3e50;">안녕하세요!</h2>
                    <p>LangCheck 계정의 <strong>비밀번호 재설정</strong>을 요청하셨습니다.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" class="reset-button">
                            🔑 비밀번호 재설정하기
                        </a>
                    </div>
                    
                    <p><strong>또는 아래 링크를 복사하여 브라우저에 붙여넣기하세요:</strong></p>
                    <div style="background: #e9ecef; padding: 15px; border-radius: 8px; word-break: break-all; font-family: 'Courier New', monospace; font-size: 12px;">
                        {reset_url}
                    </div>
                    
                    <div class="warning">
                        <p style="margin: 0;"><strong>⚠️ 보안 알림:</strong></p>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>이 링크는 <strong>1시간 동안만</strong> 유효합니다.</li>
                            <li>비밀번호 재설정을 요청하지 않으셨다면, 이 메일을 무시해주세요.</li>
                            <li>계정 보안을 위해 <strong>강력한 비밀번호</strong>를 사용해주세요.</li>
                            <li>비밀번호는 다른 사람과 절대 공유하지 마세요.</li>
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
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
                .header {{ 
                    background: linear-gradient(135deg, #ffc107 0%, #ff8f00 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                    border-radius: 8px 8px 0 0; 
                }}
                .content {{ background: #f8f9fa; padding: 40px 30px; border-radius: 0 0 8px 8px; }}
                .password-box {{ 
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                    color: white; 
                    padding: 25px; 
                    border-radius: 12px; 
                    text-align: center; 
                    margin: 25px 0; 
                    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
                }}
                .password-text {{ 
                    font-size: 24px; 
                    font-weight: bold; 
                    letter-spacing: 3px; 
                    font-family: 'Courier New', monospace;
                    margin: 10px 0;
                }}
                .warning {{ 
                    background: #f8d7da; 
                    border: 1px solid #f5c6cb; 
                    border-radius: 6px; 
                    padding: 20px; 
                    margin: 25px 0; 
                }}
                .login-button {{ 
                    display: inline-block; 
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                    color: white; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
                }}
                .footer {{ 
                    margin-top: 30px; 
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                    font-size: 12px; 
                    color: #6c757d; 
                    text-align: center; 
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 임시 비밀번호</h1>
                </div>
                <div class="content">
                    <h2 style="color: #2c3e50;">안녕하세요!</h2>
                    <p>요청하신 LangCheck 계정의 <strong>임시 비밀번호</strong>를 발급해드립니다.</p>
                    
                    <div class="password-box">
                        <div style="font-size: 16px; margin-bottom: 10px;">🔑 임시 비밀번호</div>
                        <div class="password-text">{temporary_password}</div>
                    </div>
                    
                    <div class="warning">
                        <p style="margin: 0;"><strong>🚨 중요한 보안 사항:</strong></p>
                        <ul style="margin: 15px 0 0 0; padding-left: 20px;">
                            <li><strong>로그인 후 즉시 비밀번호를 변경</strong>해주세요.</li>
                            <li>임시 비밀번호는 <strong>24시간 후 자동 만료</strong>됩니다.</li>
                            <li>이 이메일을 다른 사람과 <strong>절대 공유하지 마세요</strong>.</li>
                            <li>임시 비밀번호 사용 후 <strong>이 이메일을 삭제</strong>해주세요.</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.BASE_URL}" class="login-button">
                            🚀 로그인하러 가기
                        </a>
                    </div>
                    
                    <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
                        계정 보안을 위해 강력한 비밀번호로 변경하시기 바랍니다.<br>
                        <strong>LangCheck 팀 드림</strong> 🔒
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
    
    def send_password_reset_code_email(self, to_email: str, reset_code: str):
        """비밀번호 재설정 6자리 코드 이메일 발송"""
        
        subject = "🔑 비밀번호 재설정 인증 코드 - LangCheck"
        body = f"""
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
                .header {{ 
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                    border-radius: 8px 8px 0 0; 
                }}
                .content {{ background: #f8f9fa; padding: 40px 30px; border-radius: 0 0 8px 8px; }}
                .code-box {{ 
                    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                    color: white;
                    font-size: 36px;
                    font-weight: bold;
                    text-align: center;
                    padding: 30px;
                    border-radius: 15px;
                    margin: 30px 0;
                    letter-spacing: 8px;
                    box-shadow: 0 8px 25px rgba(0, 123, 255, 0.3);
                }}
                .warning {{ 
                    background: #fff3cd; 
                    border: 1px solid #ffeaa7; 
                    border-radius: 6px; 
                    padding: 20px; 
                    margin: 25px 0; 
                }}
                .footer {{
                    margin-top: 30px; 
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                    font-size: 12px; 
                    color: #6c757d; 
                    text-align: center; 
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔑 비밀번호 재설정</h1>
                </div>
                <div class="content">
                    <h2 style="color: #2c3e50;">안녕하세요!</h2>
                    <p>LangCheck 계정의 <strong>비밀번호 재설정</strong>을 요청하셨습니다.</p>
                    <p>아래 <strong>6자리 인증 코드</strong>를 입력해주세요:</p>
                    
                    <div class="code-box">
                        {reset_code}
                    </div>
                    
                    <div class="warning">
                        <p style="margin: 0;"><strong>⚠️ 보안 알림:</strong></p>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>이 인증 코드는 <strong>10분 동안만</strong> 유효합니다.</li>
                            <li>코드를 다른 사람과 <strong>절대 공유하지 마세요</strong>.</li>
                            <li>비밀번호 재설정을 요청하지 않으셨다면, 이 메일을 무시해주세요.</li>
                            <li>새로운 비밀번호는 <strong>8자리 이상</strong>으로 설정해주세요.</li>
                        </ul>
                    </div>
                    
                    <p style="text-align: center; margin-top: 30px;">
                        <strong>LangCheck에서 안전하게 학습하세요! 📚</strong>
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


# 네이버 이메일 서비스 인스턴스
try:
    naver_email_service = NaverEmailService()
except Exception as e:
    logger.error(f"네이버 SMTP 초기화 실패: {e}")
    naver_email_service = None 