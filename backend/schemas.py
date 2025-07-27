from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime, date
from uuid import UUID


# 사용자 관련 스키마
class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    birth_date: Optional[date] = None
    school: Optional[str] = Field(None, max_length=100)
    grade: Optional[str] = Field(None, max_length=10)
    address: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    password_confirm: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('password_confirm')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('비밀번호가 일치하지 않습니다.')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    birth_date: Optional[date] = None
    school: Optional[str] = Field(None, max_length=100)
    grade: Optional[str] = Field(None, max_length=10)
    address: Optional[str] = Field(None, max_length=255)


class UserResponse(UserBase):
    id: UUID
    points: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# 비밀번호 관련 스키마
class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)
    new_password_confirm: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('new_password_confirm')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('비밀번호가 일치하지 않습니다.')
        return v


class PasswordResetWithCode(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=100)
    new_password_confirm: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if not v.isdigit():
            raise ValueError('인증 코드는 숫자만 입력 가능합니다.')
        return v
    
    @field_validator('new_password_confirm')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('비밀번호가 일치하지 않습니다.')
        return v


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
    new_password_confirm: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('new_password_confirm')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('비밀번호가 일치하지 않습니다.')
        return v


class TemporaryPasswordRequest(BaseModel):
    email: EmailStr


# 이메일 인증 관련 스키마
class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    token: str


# 토큰 관련 스키마
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    email: Optional[str] = None


# 응답 관련 스키마
class MessageResponse(BaseModel):
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    message: str
    success: bool = False
    error_code: Optional[str] = None


# 알림 관련 스키마
class NotificationBase(BaseModel):
    title: str = Field(..., max_length=200)
    message: str
    type: str = Field(default="info", max_length=50)


class NotificationCreate(NotificationBase):
    user_id: UUID


class NotificationResponse(NotificationBase):
    id: UUID
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    success: bool = True
    notifications: List[NotificationResponse]
    pagination: Dict[str, int]
    unread_count: int


class NotificationReadResponse(BaseModel):
    success: bool = True
    message: str
    notification_id: str
    read_at: str


class NotificationMarkAllReadResponse(BaseModel):
    success: bool = True
    message: str
    updated_count: int
    read_at: str


class NotificationDeleteResponse(BaseModel):
    success: bool = True
    message: str
    deleted_notification_id: str


class NotificationBulkDeleteRequest(BaseModel):
    notification_ids: List[str] = Field(..., description="삭제할 알림 ID 목록")


class NotificationBulkDeleteResponse(BaseModel):
    success: bool = True
    message: str
    deleted_count: int


class NotificationUnreadCountResponse(BaseModel):
    success: bool = True
    count: int


class NotificationTypeInfo(BaseModel):
    type: str
    name: str
    description: str
    icon: str


class NotificationTypesResponse(BaseModel):
    success: bool = True
    notification_types: List[NotificationTypeInfo]


class NotificationTypeStats(BaseModel):
    total: int
    read: int
    read_rate: float


class NotificationDailyStat(BaseModel):
    date: str
    count: int


class NotificationStatisticsResponse(BaseModel):
    success: bool = True
    period_days: int
    total_notifications: int
    total_read: int
    overall_read_rate: float
    type_stats: Dict[str, NotificationTypeStats]
    daily_stats: List[NotificationDailyStat]


# 페이지네이션
class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=10, ge=1, le=100)


class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    size: int
    pages: int 