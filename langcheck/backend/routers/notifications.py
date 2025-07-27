"""
실시간 알림 관리 API 라우터
알림 CRUD, 읽음 처리, 실시간 알림 관리
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_

from database import get_db
from models import User, Notification
from auth import get_current_active_user
from schemas import (
    NotificationListResponse, NotificationReadResponse, 
    NotificationMarkAllReadResponse, NotificationDeleteResponse,
    NotificationBulkDeleteRequest, NotificationBulkDeleteResponse,
    NotificationUnreadCountResponse, NotificationTypesResponse,
    NotificationStatisticsResponse, NotificationTypeInfo,
    NotificationTypeStats, NotificationDailyStat
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    is_read: Optional[bool] = Query(None, description="읽음 여부 필터"),
    notification_type: Optional[str] = Query(None, description="알림 타입 필터"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    사용자의 알림 목록 조회
    """
    try:
        # 기본 쿼리
        query = select(Notification).where(Notification.user_id == current_user.id)
        
        # 필터링
        if is_read is not None:
            query = query.where(Notification.is_read == is_read)
        
        if notification_type:
            query = query.where(Notification.type == notification_type)
        
        # 총 개수 계산
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()
        
        # 정렬 및 페이징 (최신순)
        query = query.order_by(Notification.created_at.desc())
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # 데이터 조회
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        # 응답 데이터 구성
        notifications_data = []
        for notification in notifications:
            notifications_data.append({
                "id": str(notification.id),
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
                "read_at": notification.read_at.isoformat() if notification.read_at else None
            })
        
        # 읽지 않은 알림 개수
        unread_query = select(func.count()).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        )
        unread_result = await db.execute(unread_query)
        unread_count = unread_result.scalar()
        
        return {
            "success": True,
            "notifications": notifications_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            },
            "unread_count": unread_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"알림 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    읽지 않은 알림 개수 조회
    """
    try:
        query = select(func.count()).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        )
        result = await db.execute(query)
        count = result.scalar()
        
        return {
            "success": True,
            "count": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"읽지 않은 알림 개수 조회 중 오류가 발생했습니다: {str(e)}")

@router.put("/{notification_id}/read", response_model=NotificationReadResponse)
async def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    특정 알림을 읽음으로 표시
    """
    try:
        # 권한 확인
        query = select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        result = await db.execute(query)
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
        
        # 이미 읽음 상태인지 확인
        if notification.is_read:
            return {
                "success": True,
                "message": "이미 읽음 처리된 알림입니다.",
                "notification_id": notification_id
            }
        
        # 읽음 처리
        notification.is_read = True
        notification.read_at = datetime.now()
        await db.commit()
        
        return {
            "success": True,
            "message": "알림이 읽음 처리되었습니다.",
            "notification_id": notification_id,
            "read_at": notification.read_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"알림 읽음 처리 중 오류가 발생했습니다: {str(e)}")

@router.put("/read-all", response_model=NotificationMarkAllReadResponse)
async def mark_all_as_read(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    모든 읽지 않은 알림을 읽음으로 표시
    """
    try:
        now = datetime.now()
        
        # 읽지 않은 알림 모두 읽음 처리
        stmt = update(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        ).values(
            is_read=True,
            read_at=now
        )
        
        result = await db.execute(stmt)
        updated_count = result.rowcount
        await db.commit()
        
        return {
            "success": True,
            "message": f"{updated_count}개의 알림이 읽음 처리되었습니다.",
            "updated_count": updated_count,
            "read_at": now.isoformat()
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"전체 알림 읽음 처리 중 오류가 발생했습니다: {str(e)}")

@router.delete("/{notification_id}", response_model=NotificationDeleteResponse)
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    특정 알림 삭제
    """
    try:
        # 권한 확인
        query = select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        result = await db.execute(query)
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
        
        # 삭제 실행
        await db.delete(notification)
        await db.commit()
        
        return {
            "success": True,
            "message": "알림이 삭제되었습니다.",
            "deleted_notification_id": notification_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"알림 삭제 중 오류가 발생했습니다: {str(e)}")

@router.delete("/bulk-delete", response_model=NotificationBulkDeleteResponse)
async def bulk_delete_notifications(
    notification_ids: List[str] = Query(..., description="삭제할 알림 ID 목록"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    여러 알림 일괄 삭제
    """
    try:
        if not notification_ids:
            raise HTTPException(status_code=400, detail="삭제할 알림 ID가 필요합니다.")
        
        # 권한 확인
        query = select(Notification).where(
            and_(
                Notification.id.in_(notification_ids),
                Notification.user_id == current_user.id
            )
        )
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        if len(notifications) != len(notification_ids):
            raise HTTPException(status_code=404, detail="일부 알림을 찾을 수 없습니다.")
        
        # 일괄 삭제
        stmt = delete(Notification).where(
            and_(
                Notification.id.in_(notification_ids),
                Notification.user_id == current_user.id
            )
        )
        
        result = await db.execute(stmt)
        deleted_count = result.rowcount
        await db.commit()
        
        return {
            "success": True,
            "message": f"{deleted_count}개의 알림이 삭제되었습니다.",
            "deleted_count": deleted_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"알림 일괄 삭제 중 오류가 발생했습니다: {str(e)}")

@router.delete("/clear-old", response_model=Dict[str, Any])
async def clear_old_notifications(
    days: int = Query(30, ge=1, le=365, description="보관할 일수"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    오래된 알림 정리 (읽은 알림 중 지정된 일수 이전)
    """
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # 오래된 읽은 알림 삭제
        stmt = delete(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == True,
                Notification.created_at < cutoff_date
            )
        )
        
        result = await db.execute(stmt)
        deleted_count = result.rowcount
        await db.commit()
        
        return {
            "success": True,
            "message": f"{days}일 이전의 읽은 알림 {deleted_count}개가 정리되었습니다.",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"오래된 알림 정리 중 오류가 발생했습니다: {str(e)}")

@router.get("/types", response_model=NotificationTypesResponse)
async def get_notification_types():
    """
    알림 타입 목록 조회
    """
    notification_types = [
        {
            "type": "processing",
            "name": "처리중",
            "description": "시험지 분석 진행 상황",
            "icon": "⏳"
        },
        {
            "type": "success",
            "name": "성공",
            "description": "작업 완료 알림",
            "icon": "✅"
        },
        {
            "type": "error",
            "name": "오류",
            "description": "에러 발생 알림",
            "icon": "❌"
        },
        {
            "type": "info",
            "name": "정보",
            "description": "일반 정보 알림",
            "icon": "ℹ️"
        },
        {
            "type": "achievement",
            "name": "성취",
            "description": "학습 성취 알림",
            "icon": "🏆"
        }
    ]
    
    return {
        "success": True,
        "notification_types": notification_types
    }

@router.get("/statistics", response_model=NotificationStatisticsResponse)
async def get_notification_statistics(
    period: int = Query(30, ge=1, le=365, description="통계 기간 (일)"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    알림 통계 조회
    """
    try:
        start_date = datetime.now() - timedelta(days=period)
        
        # 기간별 알림 통계
        stats_query = select(
            Notification.notification_type,
            func.count(Notification.id).label('total'),
            func.sum(func.cast(Notification.is_read, 'integer')).label('read')
        ).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.created_at >= start_date
            )
        ).group_by(Notification.notification_type)
        
        stats_result = await db.execute(stats_query)
        type_stats = {}
        
        total_notifications = 0
        total_read = 0
        
        for row in stats_result:
            type_stats[row.notification_type] = {
                "total": row.total,
                "read": row.read or 0,
                "read_rate": round((row.read or 0) / max(row.total, 1) * 100, 1)
            }
            total_notifications += row.total
            total_read += (row.read or 0)
        
        # 일별 알림 수 (최근 7일)
        daily_query = select(
            func.date(Notification.created_at).label('date'),
            func.count(Notification.id).label('count')
        ).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.created_at >= datetime.now() - timedelta(days=7)
            )
        ).group_by(func.date(Notification.created_at)).order_by(func.date(Notification.created_at))
        
        daily_result = await db.execute(daily_query)
        daily_stats = [
            {
                "date": row.date.isoformat(),
                "count": row.count
            } for row in daily_result
        ]
        
        return {
            "success": True,
            "period_days": period,
            "summary": {
                "total_notifications": total_notifications,
                "total_read": total_read,
                "total_unread": total_notifications - total_read,
                "read_rate": round(total_read / max(total_notifications, 1) * 100, 1)
            },
            "by_type": type_stats,
            "daily_trend": daily_stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"알림 통계 조회 중 오류가 발생했습니다: {str(e)}") 