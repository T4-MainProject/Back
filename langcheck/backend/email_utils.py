import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from config import settings
import secrets
import string

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
    
    def send_email(self, to_email: str, subject: str, body: str, is_html: bool = False):
        """이메일 발송 공통 함수"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # HTML 또는 일반 텍스트 설정
            if is_html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))
            
            # SMTP 서버 연결 및 이메일 발송
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"이메일 발송 성공: {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"이메일 발송 실패: {to_email}, 오류: {str(e)}")
            return False
    
    def send_verification_email(self, to_email: str, verification_token: str):
        """이메일 인증 메일 발송"""
        verification_url = f"http://localhost:5173/verify-email/{verification_token}"
        
        subject = "이메일 인증을 완료해주세요"
        body = f"""
        <html>
        <body>
            <h2>이메일 인증</h2>
            <p>안녕하세요!</p>
            <p>아래 링크를 클릭하여 이메일 인증을 완료해주세요:</p>
            <p><a href="{verification_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">이메일 인증하기</a></p>
            <p>또는 아래 링크를 복사하여 브라우저에 붙여넣기하세요:</p>
            <p>{verification_url}</p>
            <p>이 링크는 24시간 동안 유효합니다.</p>
            <p>감사합니다.</p>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, body, is_html=True)
    
    def send_password_reset_email(self, to_email: str, reset_token: str):
        """비밀번호 재설정 메일 발송"""
        reset_url = f"http://localhost:3000/reset-password/{reset_token}"
        
        subject = "비밀번호 재설정 요청"
        body = f"""
        <html>
        <body>
            <h2>비밀번호 재설정</h2>
            <p>안녕하세요!</p>
            <p>비밀번호 재설정을 요청하셨습니다.</p>
            <p>아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요:</p>
            <p><a href="{reset_url}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">비밀번호 재설정하기</a></p>
            <p>또는 아래 링크를 복사하여 브라우저에 붙여넣기하세요:</p>
            <p>{reset_url}</p>
            <p>이 링크는 1시간 동안 유효합니다.</p>
            <p>만약 비밀번호 재설정을 요청하지 않으셨다면, 이 메일을 무시해주세요.</p>
            <p>감사합니다.</p>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, body, is_html=True)
    
    def send_temporary_password_email(self, to_email: str, temporary_password: str):
        """임시 비밀번호 발송"""
        subject = "임시 비밀번호 발급"
        body = f"""
        <html>
        <body>
            <h2>임시 비밀번호</h2>
            <p>안녕하세요!</p>
            <p>요청하신 임시 비밀번호를 발급해드립니다.</p>
            <p><strong>임시 비밀번호: {temporary_password}</strong></p>
            <p>로그인 후 반드시 비밀번호를 변경해주세요.</p>
            <p>보안을 위해 임시 비밀번호는 24시간 후 자동으로 만료됩니다.</p>
            <p>감사합니다.</p>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, body, is_html=True)


def generate_temporary_password(length: int = 10) -> str:
    """임시 비밀번호 생성"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# 이메일 서비스 인스턴스
email_service = EmailService() 