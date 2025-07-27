"""
YOLO 기반 답안 영역 감지 및 체크마크 인식 서비스
안정적인 설정 + 간단한 QNA 크롭 방식으로 개선
"""

import os
import logging
import uuid
import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
import json
from pathlib import Path
import time

# === 절대경로로 crops_dir 고정 ===
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CROPS_DIR = os.path.join(BASE_DIR, "crops")

# YOLO는 import 에러 무시 (실제 환경에서는 작동)
try:
    import torch
    from ultralytics import YOLO
except ImportError:
    YOLO = None

logger = logging.getLogger(__name__)

class YOLOService:
    def __init__(self):
        """YOLO 모델 및 설정 초기화"""
        self.model_path = "weights/yolov8/best.pt"
        self.upload_dir = "uploads"
        self.crops_dir = Path(CROPS_DIR)  # 항상 Path 객체로 고정
        self.model = None
        
        # VisionService 인스턴스 초기화
        try:
            from services.vision_service import VisionService
            self.vision_service = VisionService()
            print("✅ VisionService 초기화 완료")
        except Exception as e:
            print(f"⚠️ VisionService 초기화 실패: {e}")
            self.vision_service = None
        
        # 더 관대한 설정 (문제 감지율 향상)
        self.confidence_threshold = 0.1  # 0.2 → 0.1로 낮춤 (더 많은 객체 감지)
        self.iou_threshold = 0.25  # 0.35 → 0.25로 낮춤 (중복 허용)
        self.image_size = 1280  # 1024 → 1280으로 증가 (더 높은 해상도)
        self.max_detections = 1000  # 600 → 1000으로 증가 (더 많은 감지)
        
        # 클래스 매핑
        self.class_names = {
            0: "check1",
            1: "check2", 
            2: "check3",
            3: "check4",
            4: "check5",
            5: "check_box",      # 체크박스
            6: "qna_box",        # 문제 영역
            7: "passage_box"     # 지문 영역
        }
        
        # 디렉토리 생성
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.crops_dir, exist_ok=True)
        
        self._load_model()

    def _load_model(self):
        """YOLO 모델 로드 (안정적인 방식)"""
        if not YOLO:
            logger.warning("YOLO 모듈을 찾을 수 없습니다. 모델 로딩을 건너뜁니다.")
            return
        try:
            logger.info("🚀 YOLO 모델 로딩 시작")
            logger.info(f"모델 경로: {self.model_path}")
            
            # DFLoss 오류 방지를 위한 환경변수 설정
            os.environ['TORCH_ALLOW_UNSAFE_LOADING'] = '1'
            os.environ['CUDA_LAUNCH_BLOCKING'] = '0'
            
            # ultralytics 모듈에서 DFLoss 오류 방지
            try:
                import ultralytics.utils.loss
                # DFLoss가 없으면 임시로 추가
                if not hasattr(ultralytics.utils.loss, 'DFLoss'):
                    class DFLoss:
                        def __init__(self):
                            pass
                    ultralytics.utils.loss.DFLoss = DFLoss
                    logger.info("✅ DFLoss 임시 추가 완료")
            except Exception as loss_error:
                logger.warning(f"⚠️ DFLoss 처리 중 오류: {loss_error}")
            
            import torch
            logger.info(f"CUDA available: {torch.cuda.is_available()}")
            if torch.cuda.is_available():
                logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
                torch.cuda.empty_cache()
                torch.backends.cudnn.benchmark = True
            
            # 모델 로드 (안전한 방식)
            self.model = YOLO(self.model_path)
            logger.info("✅ YOLO 모델 로드 완료")
            logger.info(f"📊 모델 클래스: {self.model.names}")
            
        except Exception as e:
            logger.error(f"❌ 모델 로드 실패: {e}")
            logger.info("🔄 Mock 모드로 전환합니다.")
            self.model = None

    async def analyze_exam_paper(self, image_path: str, question_numbers: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """시험지 분석 (안정적인 설정 + QNA 크롭)"""
        print(f"🔍 YOLO 분석 시작: {image_path}")
        start_time = time.time()
        
        if question_numbers is None:
            question_numbers = []
            
        if not self.model:
            return self._create_mock_result(image_path, question_numbers)
        
        try:
            # YOLO 추론 (안정적인 설정)
            print("🔍 YOLO 추론 시작 (안정적 + 크롭 모드)...")
            results = self.model.predict(
                source=image_path,
                imgsz=self.image_size,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                max_det=self.max_detections,
                save=False,
                verbose=False
            )
            
            # 결과 처리
            res = results[0]
            detections = self._process_yolo_results(res, image_path)
            self._last_detections = detections # YOLO 결과를 클래스 변수에 저장

            # 모든 감지 결과 로깅
            print(f"🔍 전체 감지 결과: {len(detections)}개")
            class_counts = {}
            for det in detections:
                class_name = det['class']
                class_counts[class_name] = class_counts.get(class_name, 0) + 1
            print(f"📊 클래스별 감지 결과: {class_counts}")

            # QNA 박스 분리
            qna_boxes = [d for d in detections if d['class'] == 'qna_box']
            checkmarks = [d for d in detections if d['class'].startswith('check')]

            print(f"📊 YOLO 감지 결과: qna_boxes: {len(qna_boxes)}개, checkmarks: {len(checkmarks)}개")
            
            # QNA 박스에 임시 순서 부여 (YOLO 감지 순서대로)
            for i, box in enumerate(qna_boxes):
                box['temp_order'] = i + 1
                print(f"📋 QNA 박스 {i+1}: 위치 ({box['bbox']['x1']:.0f}, {box['bbox']['y1']:.0f})")
            
            if not qna_boxes:
                print("❌ QNA 박스가 감지되지 않음!")
                print("🔍 대안: 모든 감지 결과를 확인해보겠습니다...")
                
                # 모든 감지 결과를 로깅
                for i, det in enumerate(detections[:10]):  # 처음 10개만
                    print(f"   {i+1}. {det['class']} (신뢰도: {det['confidence']:.3f})")
                
                # 만약 다른 클래스가 감지되었다면 그것을 사용
                if detections:
                    print("⚠️ QNA 박스 대신 다른 클래스를 사용합니다.")
                    # 모든 감지 결과를 qna_box로 간주
                    qna_boxes = detections
                    checkmarks = []
                else:
                    print("❌ 아무것도 감지되지 않음! Mock 결과를 반환합니다.")
                    return self._create_mock_result(image_path, question_numbers)

            # QNA 박스 크롭 생성
            crop_results = await self._create_qna_crops(image_path, qna_boxes)

            # 문제별 답안 매핑
            question_answers = self._map_answers_to_questions(qna_boxes, checkmarks, question_numbers)
            
            # 실제 문제번호 순서로 정렬 (중요!)
            if crop_results:
                # 유효한 문제번호만 필터링 (1~50 범위)
                valid_results = [r for r in crop_results if (r.get('question_number') and 
                                                           r.get('question_number') != 'N/A' and
                                                           isinstance(r.get('question_number'), (int, str)) and
                                                           str(r.get('question_number')).isdigit() and
                                                           1 <= int(r.get('question_number')) <= 50)]
                invalid_results = [r for r in crop_results if r not in valid_results]
                
                # 유효한 결과를 실제 문제번호로 정렬
                valid_results.sort(key=lambda x: int(x.get('question_number', 999)))
                
                # 최종 결과: 유효한 결과 + 무효한 결과
                crop_results = valid_results + invalid_results
                
                print(f"📊 문제번호 순서로 정렬 완료: {[c.get('question_number', 'N/A') for c in crop_results]}")
                print(f"✅ 유효한 문제: {len(valid_results)}개, 무효한 문제: {len(invalid_results)}개")
                
                # 누락된 문제번호 확인
                if valid_results:
                    valid_numbers = [int(r.get('question_number')) for r in valid_results]
                    expected_range = list(range(1, max(valid_numbers) + 1))
                    missing_numbers = [n for n in expected_range if n not in valid_numbers]
                    if missing_numbers:
                        print(f"⚠️ 누락된 문제번호: {missing_numbers}")

            # 통계 분석
            statistics = self._analyze_statistics(question_answers, detections)
            
            duration = round(time.time() - start_time, 2)

            return {
                "success": True,
                "processing_time": duration,
                "total_detections": len(detections),
                "qna_boxes": len(qna_boxes),
                "checkmarks": len(checkmarks),
                "question_answers": question_answers,
                "crop_results": crop_results,
                "statistics": statistics,
                "detection_settings": {
                    "confidence_threshold": self.confidence_threshold,
                    "iou_threshold": self.iou_threshold,
                    "image_size": self.image_size,
                    "max_detections": self.max_detections
                }
            }
            
        except Exception as e:
            logger.error(f"YOLO 분석 실패: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "processing_time": round(time.time() - start_time, 2),
                "total_detections": 0,
                "qna_boxes": 0,
                "checkmarks": 0,
                "question_answers": [],
                "crop_results": [],
                "statistics": {}
            }

    def _process_yolo_results(self, result, image_path: str) -> List[Dict[str, Any]]:
        """YOLO 결과를 처리하여 검출 정보 추출"""
        detections = []
        
        if result.boxes is None:
            return detections
        
        boxes = result.boxes.xyxy.cpu().numpy()
        confidences = result.boxes.conf.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy()
        
        # 실제 모델의 클래스명 사용
        if self.model and hasattr(self.model, 'names') and self.model.names:
            class_names = self.model.names
            print(f"🔍 실제 모델 클래스명 사용: {class_names}")
        else:
            class_names = self.class_names
            print(f"🔍 기본 클래스명 사용: {class_names}")
        
        for i, (box, conf, cls) in enumerate(zip(boxes, confidences, classes)):
            x1, y1, x2, y2 = box
            class_name = class_names.get(int(cls), f'class_{int(cls)}')
            
            detections.append({
                "id": i,
                "class": class_name,
                "confidence": float(conf),
                "bbox": {
                    "x1": float(x1),
                    "y1": float(y1),
                    "x2": float(x2),
                    "y2": float(y2)
                },
                "center": {
                    "x": float((x1 + x2) / 2),
                    "y": float((y1 + y2) / 2)
                },
                "area": float((x2 - x1) * (y2 - y1)),
                "width": float(x2 - x1),
                "height": float(y2 - y1)
            })
        
        return detections

    def _map_answers_to_questions(self, qna_boxes: List[Dict], checkmarks: List[Dict], 
                                  question_numbers: Optional[List[Dict]] = None) -> List[Dict[str, Any]]:
        """QNA 박스와 체크마크 매핑 (Y좌표 기반 정렬 보장)"""
        question_answers = []
        # QNA 박스를 Y좌표로 정렬 (위에서 아래로)
        qna_boxes = sorted(qna_boxes, key=lambda x: x['bbox']['y1'])
        # 각 QNA 박스에 임시 순서 부여
        for display_order, qna_box in enumerate(qna_boxes):
            # QNA 박스 내부의 체크마크 찾기
            box_checkmarks = []
            for checkmark in checkmarks:
                if self._is_point_in_box(checkmark['center'], qna_box['bbox']):
                    box_checkmarks.append(checkmark)
            # check1~5 중 신뢰도 가장 높은 것 하나만 남김
            best_checkmark = None
            if box_checkmarks:
                check_candidates = [c for c in box_checkmarks if c['class'].startswith('check') and c['class'] not in ('check_box', 'checkbox')]
                if check_candidates:
                    best_checkmark = max(check_candidates, key=lambda x: x['confidence'])
                    box_checkmarks = [best_checkmark]
                else:
                    box_checkmarks = []
            # 답안 결정
            detected_answer = None
            confidence = 0.0
            if box_checkmarks:
                best = box_checkmarks[0]
                class_name = best['class']
                confidence = best['confidence']
                if class_name.startswith('check') and len(class_name) > 5:
                    try:
                        answer_number = int(class_name[5:])
                        if 1 <= answer_number <= 5:
                            detected_answer = str(answer_number)
                    except ValueError:
                        pass
            # 임시 문제번호 (나중에 VisionService에서 보정됨)
            temp_question_number = display_order + 1
            question_answers.append({
                "temp_question_number": temp_question_number,
                "display_order": display_order + 1,
                "detected_answer": detected_answer,
                "confidence": confidence,
                "checkmarks_found": len(box_checkmarks),
                "qna_box": qna_box,
                "checkmarks": box_checkmarks,
                "bbox": qna_box['bbox'],
                "y_position": qna_box['bbox']['y1']  # 정렬 확인용
            })
        return question_answers

    def _is_point_in_box(self, point: Dict, bbox: Dict) -> bool:
        """점이 박스 내부에 있는지 확인"""
        return (bbox['x1'] <= point['x'] <= bbox['x2'] and 
                bbox['y1'] <= point['y'] <= bbox['y2'])

    async def _create_qna_crops(self, image_path: str, qna_boxes: List[Dict]) -> List[Dict[str, Any]]:
        print("=== _create_qna_crops 함수 진입 ===")
        print(f"QNA 박스 개수: {len(qna_boxes)}")
        crop_results = []
        base_filename = Path(image_path).stem
        try:
            image = cv2.imread(image_path)
            if image is None:
                print(f"❌ 이미지 로드 실패: {image_path}")
                return crop_results
            detections = getattr(self, '_last_detections', None)
            if detections is None:
                results = self.model.predict(
                    source=image_path,
                    imgsz=self.image_size,
                    conf=self.confidence_threshold,
                    iou=self.iou_threshold,
                    max_det=self.max_detections,
                    save=False,
                    verbose=False
                )
                res = results[0]
                detections = self._process_yolo_results(res, image_path)
            for i, qna_box in enumerate(qna_boxes):
                print(f"QNA BOX {i+1} 처리 중")
                try:
                    print("크롭 진입 - 좌표 파싱 시도")
                    x1 = int(qna_box['bbox']['x1'])
                    y1 = int(qna_box['bbox']['y1'])
                    x2 = int(qna_box['bbox']['x2'])
                    y2 = int(qna_box['bbox']['y2'])
                    print("크롭 진입 - 좌표 파싱 성공")
                    padding = 20  # 패딩 증가
                    h, w = image.shape[:2]
                    x1 = max(0, x1 - padding)
                    y1 = max(0, y1 - padding)
                    x2 = min(w, x2 + padding)
                    y2 = min(h, y2 + padding)
                    cropped = image[y1:y2, x1:x2].copy()
                    
                    # 이미지 전처리 (OCR 정확도 향상)
                    # 그레이스케일 변환
                    gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
                    # 노이즈 제거
                    denoised = cv2.fastNlMeansDenoising(gray)
                    # 대비 향상
                    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                    enhanced = clahe.apply(denoised)
                    # 다시 BGR로 변환
                    cropped = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
                    crop_checkmarks = [d for d in detections if d['class'].startswith('check') and self._is_point_in_box(d['center'], qna_box['bbox'])]
                    for det in crop_checkmarks:
                        bx = det['bbox']
                        cx1 = int(bx['x1']) - x1
                        cy1 = int(bx['y1']) - y1
                        cx2 = int(bx['x2']) - x1
                        cy2 = int(bx['y2']) - y1
                        color = (0, 0, 255)
                        cv2.rectangle(cropped, (cx1, cy1), (cx2, cy2), color, 2)
                        label = f"{det['class']}:{det['confidence']:.2f}"
                        cv2.putText(cropped, label, (cx1, max(cy1-5, 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                    tmp_crop_filename = f"{base_filename}_qna_tmp{i+1}.jpg"
                    tmp_crop_path = self.crops_dir / tmp_crop_filename
                    abs_crop_path = os.path.abspath(str(tmp_crop_path))
                    print(f"크롭 저장 시도: {abs_crop_path}")
                    try:
                        success = cv2.imwrite(str(tmp_crop_path), cropped)
                        if success:
                            print(f"  -> 저장 성공: {abs_crop_path}")
                        else:
                            print(f"  -> 저장 실패(Unknown): {abs_crop_path}")
                    except Exception as e:
                        print(f"  -> 저장 실패: {e}")
                    # 크롭 시점에 바로 GPT 분석 추가
                    print(f"🤖 GPT 분석 시작: 크롭 {i+1}")
                    try:
                        if self.vision_service:
                            print(f"   📋 문제번호 추출 중...")
                            # 문제번호 추출 (더 정확한 프롬프트)
                            number_prompt = (
                                "이 시험 문제 이미지에서 문제번호를 정확히 추출하세요. "
                                "문제 텍스트 맨 앞에 있는 '숫자.' 형태의 문제번호만 찾아주세요. "
                                "예시: '4. 대화를 듣고...' → 4번, '12. 다음을 읽고...' → 12번 "
                                "주의: 그림 안의 (1), (2), (3) 같은 선택지 번호는 무시하고, "
                                "실제 문제번호만 찾으세요. "
                                "문제번호는 1~50 사이의 정수여야 합니다. "
                                "0번이나 음수는 유효하지 않습니다. "
                                "문제번호가 명확하지 않으면 'N/A'로 응답하세요. "
                                "OCR 결과가 불분명하면 'N/A'로 응답하세요. "
                                "{ \"question_number\": 4 } 또는 { \"question_number\": \"N/A\" } 형식으로만 응답하세요."
                            )
                            # 문제번호 추출 (재시도 로직 포함)
                            question_number = None
                            for attempt in range(2):  # 최대 2번 시도
                                try:
                                    number_response = await self.vision_service._call_gpt4o_vision(number_prompt, str(tmp_crop_path))
                                    print(f"   📋 문제번호 GPT 응답 (시도 {attempt+1}): {number_response}")
                                    number_result = self.vision_service._parse_json(number_response)
                                    temp_number = number_result.get('question_number', 'N/A')
                                    
                                    # 유효성 검증
                                    if (temp_number != 'N/A' and 
                                        isinstance(temp_number, (int, str)) and 
                                        str(temp_number).isdigit() and
                                        1 <= int(temp_number) <= 50):
                                        question_number = int(temp_number)
                                        print(f"   ✅ 문제번호 추출 완료: {question_number}번")
                                        break
                                    else:
                                        print(f"   ⚠️ 유효하지 않은 문제번호: {temp_number}")
                                        if attempt == 0:  # 첫 번째 시도에서 실패하면 더 구체적인 프롬프트로 재시도
                                            number_prompt = (
                                                "이 이미지에서 문제번호를 다시 한 번 정확히 확인해주세요. "
                                                "문제 텍스트 맨 앞의 숫자만 찾아주세요. "
                                                "예: '6. 다음 글을 읽고...' → 6번 "
                                                "숫자가 명확하지 않으면 'N/A'로 응답하세요. "
                                                "{ \"question_number\": 6 } 또는 { \"question_number\": \"N/A\" }"
                                            )
                                except Exception as e:
                                    print(f"   ⚠️ 문제번호 추출 실패 (시도 {attempt+1}): {e}")
                            
                            if question_number is None:
                                question_number = 'N/A'
                                print(f"   ❌ 문제번호 추출 실패: N/A로 설정")
                            
                            print(f"   🎯 답안 추출 중...")
                            # 답안 추출 (더 정확한 프롬프트)
                            answer_prompt = (
                                "이 시험 문제에서 학생이 선택한 답안을 정확히 찾아주세요. "
                                "체크된 답안(1, 2, 3, 4, 5번 중 하나)을 찾아서 숫자로만 응답하세요. "
                                "체크된 답안이 없거나 불분명하면 'N/A'로 응답하세요. "
                                "주의: 문제번호가 아닌 선택지 번호를 찾으세요. "
                                "예시: 1번 선택지에 체크되어 있으면 '1', 3번 선택지에 체크되어 있으면 '3' "
                                "체크 표시가 명확하지 않으면 'N/A'로 응답하세요. "
                                "여러 개가 체크되어 있으면 가장 확실한 것 하나만 선택하세요. "
                                "{ \"detected_answer\": \"3\" } 또는 { \"detected_answer\": \"N/A\" } 형식으로만 응답하세요."
                            )
                            # 문제 텍스트 분석 (그림 문제인지 확인)
                            print(f"   📝 문제 텍스트 분석 중...")
                            text_analysis_prompt = (
                                "이 시험 문제 이미지에서 문제 텍스트를 분석하세요. "
                                "문제가 그림이나 이미지를 참조하는지 확인하세요. "
                                "예시: '그림에서', '다음 그림을 보고', '그림을 참고하여' 등이 포함되어 있으면 그림 문제입니다. "
                                "{ \"is_image_question\": true/false, \"question_text\": \"문제 텍스트 일부\" } 형식으로 응답하세요."
                            )
                            
                            try:
                                text_response = await self.vision_service._call_gpt4o_vision(text_analysis_prompt, str(tmp_crop_path))
                                text_result = self.vision_service._parse_json(text_response)
                                is_image_question = text_result.get('is_image_question', False)
                                question_text = text_result.get('question_text', '')
                                print(f"   📋 문제 분석: 그림문제={is_image_question}, 텍스트='{question_text[:50]}...'")
                            except Exception as e:
                                print(f"   ⚠️ 문제 텍스트 분석 실패: {e}")
                                is_image_question = False
                            
                            # YOLO 체크박스 감지 확인
                            crop_checkmarks = [d for d in detections if d['class'].startswith('check') and self._is_point_in_box(d['center'], qna_box['bbox'])]
                            has_yolo_checkmarks = len(crop_checkmarks) > 0
                            print(f"   🔍 YOLO 체크박스 감지: {len(crop_checkmarks)}개")
                            
                            # 답안 추출 (상황별 프롬프트)
                            detected_answer = None
                            for attempt in range(2):  # 최대 2번 시도
                                try:
                                    # 상황별 프롬프트 선택
                                    if is_image_question:
                                        # 그림 문제: 전체 이미지에서 답안 찾기
                                        answer_prompt = (
                                            "이 시험 문제 이미지에서 학생이 선택한 답안을 정확히 찾아주세요. "
                                            "이 문제는 그림이나 이미지를 참조하는 문제입니다. "
                                            "그림 안의 선택지나 체크 표시를 찾아서 1, 2, 3, 4, 5번 중 하나로 응답하세요. "
                                            "체크된 답안이 없거나 불분명하면 'N/A'로 응답하세요. "
                                            "{ \"detected_answer\": \"3\" } 또는 { \"detected_answer\": \"N/A\" } 형식으로만 응답하세요."
                                        )
                                        print(f"   🖼️ 그림 문제 모드로 답안 추출")
                                    elif not has_yolo_checkmarks:
                                        # YOLO가 체크박스를 못 찾음: 전체 영역에서 체크박스 찾기
                                        answer_prompt = (
                                            "이 시험 문제 이미지에서 체크박스나 선택지를 찾아 학생이 선택한 답안을 정확히 찾아주세요. "
                                            "체크박스 안에 체크 표시가 있는지 확인하고, 체크된 번호(1, 2, 3, 4, 5)를 답으로 내세요. "
                                            "체크된 답안이 없거나 불분명하면 'N/A'로 응답하세요. "
                                            "{ \"detected_answer\": \"3\" } 또는 { \"detected_answer\": \"N/A\" } 형식으로만 응답하세요."
                                        )
                                        print(f"   🔍 체크박스 찾기 모드로 답안 추출")
                                    else:
                                        # YOLO가 체크박스를 감지한 경우: 체크박스 안의 체크 확인
                                        answer_prompt = (
                                            "이 시험 문제에서 YOLO가 감지한 체크박스 영역을 확인하세요. "
                                            "체크박스 안에 체크 표시가 있는지 확인하고, 체크된 번호(1, 2, 3, 4, 5)를 답으로 내세요. "
                                            "체크된 답안이 없거나 불분명하면 'N/A'로 응답하세요. "
                                            "주의: 문제번호가 아닌 선택지 번호를 찾으세요. "
                                            "예시: 1번 체크박스에 체크되어 있으면 '1', 3번 체크박스에 체크되어 있으면 '3' "
                                            "체크 표시가 명확하지 않으면 'N/A'로 응답하세요. "
                                            "여러 개가 체크되어 있으면 가장 확실한 것 하나만 선택하세요. "
                                            "{ \"detected_answer\": \"3\" } 또는 { \"detected_answer\": \"N/A\" } 형식으로만 응답하세요."
                                        )
                                        print(f"   ✅ YOLO 체크박스 감지 모드로 답안 추출")
                                    
                                    answer_response = await self.vision_service._call_gpt4o_vision(answer_prompt, str(tmp_crop_path))
                                    print(f"   🎯 답안 GPT 응답 (시도 {attempt+1}): {answer_response}")
                                    answer_result = self.vision_service._parse_json(answer_response)
                                    temp_answer = answer_result.get('detected_answer', 'N/A')
                                    
                                    # 유효성 검증
                                    if (temp_answer != 'N/A' and 
                                        isinstance(temp_answer, (int, str)) and 
                                        str(temp_answer) in ['1', '2', '3', '4', '5']):
                                        detected_answer = str(temp_answer)
                                        print(f"   ✅ 답안 추출 완료: '{detected_answer}'")
                                        break
                                    else:
                                        print(f"   ⚠️ 유효하지 않은 답안: {temp_answer}")
                                        if attempt == 0:  # 첫 번째 시도에서 실패하면 더 구체적인 프롬프트로 재시도
                                            answer_prompt = (
                                                "이 이미지에서 체크된 답안을 다시 한 번 정확히 확인해주세요. "
                                                "1, 2, 3, 4, 5번 중 하나만 찾아주세요. "
                                                "체크 표시가 명확하지 않으면 'N/A'로 응답하세요. "
                                                "{ \"detected_answer\": \"3\" } 또는 { \"detected_answer\": \"N/A\" }"
                                            )
                                except Exception as e:
                                    print(f"   ⚠️ 답안 추출 실패 (시도 {attempt+1}): {e}")
                            
                            if detected_answer is None:
                                detected_answer = 'N/A'
                                print(f"   ❌ 답안 추출 실패: N/A로 설정")
                            
                            # 최종 파일명 (문제번호 기반)
                            final_filename = f"{base_filename}_qna_{question_number}.jpg"
                            final_crop_path = self.crops_dir / final_filename
                            
                            # 파일명 변경 (안전하게)
                            try:
                                if tmp_crop_path.exists() and not final_crop_path.exists():
                                    os.rename(str(tmp_crop_path), str(final_crop_path))
                                    print(f"📝 크롭 파일명 변경: {tmp_crop_filename} → {final_filename}")
                                elif tmp_crop_path.exists():
                                    # 최종 파일이 이미 존재하면 임시 파일 삭제
                                    os.remove(str(tmp_crop_path))
                                    print(f"🗑️ 중복 파일 삭제: {tmp_crop_filename}")
                                else:
                                    print(f"⚠️ 임시 파일 없음: {tmp_crop_filename}")
                            except Exception as e:
                                print(f"⚠️ 파일명 변경 실패: {e}")
                                # 파일명 변경 실패해도 계속 진행
                            
                            # 문제번호 유효성 검증 및 중복 처리 (더 엄격한 검증)
                            if (question_number and question_number != 'N/A' and 
                                detected_answer and detected_answer != 'N/A' and
                                question_number > 0 and question_number <= 50 and  # 유효한 범위 검증
                                qna_box['confidence'] > 0.6):  # 신뢰도 임계값 추가
                                
                                # 중복 문제번호 확인
                                existing_numbers = [r.get('question_number') for r in crop_results]
                                if question_number in existing_numbers:
                                    print(f"⚠️ 중복 문제번호 발견: {question_number}번, 임시 번호로 변경")
                                    # 임시 번호 부여 (100 + 순서)
                                    question_number = 100 + len(crop_results) + 1
                                    final_filename = f"{base_filename}_qna_{question_number}.jpg"
                                    final_crop_path = self.crops_dir / final_filename
                                
                                crop_results.append({
                                    "crop_path": str(final_crop_path),
                                    "question_number": question_number,
                                    "detected_answer": detected_answer,
                                    "question_text": question_text,  # 개별 문제 텍스트 추가
                                    "bbox": qna_box['bbox'],
                                    "confidence": qna_box['confidence'],
                                    "success": True
                                })
                            else:
                                print(f"⚠️ 유효하지 않은 데이터: 문제번호={question_number}, 답안={detected_answer}")
                            print(f"✅ 크롭 + GPT 분석 완료: 문제 {question_number}번 - 답안 '{detected_answer}'")
                        else:
                            print("⚠️ VisionService 인스턴스가 초기화되지 않았습니다. GPT 분석을 건너뜁니다.")
                            crop_results.append({
                                "tmp_crop_path": str(tmp_crop_path),
                                "tmp_crop_filename": tmp_crop_filename,
                                "bbox": qna_box['bbox'],
                                "confidence": qna_box['confidence'],
                                "success": True
                            })
                            print(f"📸 임시 크롭 저장 완료: {tmp_crop_filename}")
                        
                    except Exception as gpt_error:
                        print(f"⚠️ GPT 분석 실패: {gpt_error}")
                        import traceback
                        traceback.print_exc()
                        crop_results.append({
                            "tmp_crop_path": str(tmp_crop_path),
                            "tmp_crop_filename": tmp_crop_filename,
                            "bbox": qna_box['bbox'],
                            "confidence": qna_box['confidence'],
                            "success": True
                        })
                        print(f"📸 임시 크롭 저장 완료: {tmp_crop_filename}")
                except Exception as e:
                    print(f"  -> 크롭 실패: {e}")
                    crop_results.append({
                        "success": False,
                        "error": str(e)
                    })
            print(f"✂️ {len(crop_results)}개 QNA 박스 크롭 완료")
        except Exception as e:
            print(f"⚠️ QNA 크롭 실패: {e}")
        return crop_results

    def _analyze_statistics(self, question_answers: List[Dict], detections: List[Dict]) -> Dict[str, Any]:
        """검출 결과 통계 분석"""
        total_questions = len(question_answers)
        answered_questions = len([q for q in question_answers if q['detected_answer']])
        
        # 신뢰도 통계
        confidences = [q['confidence'] for q in question_answers if q['confidence'] > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # 클래스별 통계
        class_counts = {}
        for detection in detections:
            class_name = detection['class']
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
        
        # 검출 품질 등급
        if avg_confidence > 0.8 and answered_questions / max(total_questions, 1) > 0.9:
            quality_grade = "A"
        elif avg_confidence > 0.6 and answered_questions / max(total_questions, 1) > 0.7:
            quality_grade = "B"
        elif avg_confidence > 0.4:
            quality_grade = "C"
        else:
            quality_grade = "D"
        
        return {
            "total_questions": total_questions,
            "answered_questions": answered_questions,
            "answer_rate": answered_questions / max(total_questions, 1),
            "average_confidence": round(avg_confidence, 3),
            "total_detections": len(detections),
            "class_counts": class_counts,
            "quality_grade": quality_grade,
            "confidence_distribution": {
                "high (>0.8)": len([c for c in confidences if c > 0.8]),
                "medium (0.5-0.8)": len([c for c in confidences if 0.5 <= c <= 0.8]),
                "low (<0.5)": len([c for c in confidences if c < 0.5])
            }
        }

    def _create_mock_result(self, image_path: str, question_numbers: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """YOLO 모델이 없을 때 목업 결과 반환 (실제 데이터 구조와 동일)"""
        # 실제 시험지처럼 12개 문제 생성
        mock_questions = [{"number": i+1} for i in range(12)]
        
        mock_answers = []
        for i, q in enumerate(mock_questions):
            # 실제 답안 패턴 (1~5번 중 랜덤)
            detected_answer = str((i % 5) + 1)
            confidence = 0.85 + (i % 3) * 0.05
            
            mock_answers.append({
                "question_number": q.get("number", i+1),
                "detected_answer": detected_answer,
                "confidence": confidence,
                "checkmarks_found": 1,
                "qna_box": {
                    "bbox": {"x1": 10, "y1": 50 + i*30, "x2": 300, "y2": 80 + i*30}
                },
                "checkmarks": [],
                "bbox": {"x1": 10, "y1": 50 + i*30, "x2": 300, "y2": 80 + i*30}
            })
        
        # Mock 크롭 결과도 생성
        mock_crops = []
        base_filename = Path(image_path).stem
        for i in range(12):
            mock_crops.append({
                "crop_path": f"crops/{base_filename}_qna_{i+1}.jpg",
                "question_number": i+1,
                "success": True
            })
        
        return {
            "success": True,
            "processing_time": 0.5,
            "total_detections": len(mock_answers) * 2,
            "qna_boxes": len(mock_answers),
            "checkmarks": len(mock_answers),
            "question_answers": mock_answers,
            "crop_results": mock_crops,
            "statistics": {
                "total_questions": len(mock_answers),
                "answered_questions": len(mock_answers),
                "answer_rate": 1.0,
                "average_confidence": 0.87,
                "quality_grade": "A",
                "class_counts": {"qna_box": len(mock_answers), "check1": len(mock_answers)},
                "confidence_distribution": {"high (>0.8)": len(mock_answers), "medium (0.5-0.8)": 0, "low (<0.5)": 0}
            },
            "detection_settings": {
                "confidence_threshold": self.confidence_threshold,
                "iou_threshold": self.iou_threshold,
                "image_size": self.image_size,
                "max_detections": self.max_detections
            },
            "processing_method": "yolo_mock_mode",
            "note": "YOLO 모델이 로드되지 않아 목업 데이터를 반환합니다."
        }

    def crop_images(self, image_path: str, detections: Dict, output_dir: str = "crops") -> List[str]:
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        image = cv2.imread(image_path)
        if image is None:
            print(f"이미지 로드 실패: {image_path}")
            return []
        crop_paths = []
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        for i, qna_box in enumerate(detections.get("qna_boxes", [])):
            x1, y1, x2, y2 = map(int, qna_box["coordinates"])
            margin = 10
            x1 = max(0, x1 - margin)
            y1 = max(0, y1 - margin)
            x2 = min(image.shape[1], x2 + margin)
            y2 = min(image.shape[0], y2 + margin)
            cropped = image[y1:y2, x1:x2]
            crop_path = os.path.join(output_dir, f"{base_name}_qna_{i+1}.jpg")
            abs_crop_path = os.path.abspath(crop_path)
            print(f"크롭 저장 시도: {abs_crop_path}")
            try:
                success = cv2.imwrite(crop_path, cropped)
                if success:
                    print(f"  -> 저장 성공: {abs_crop_path}")
                else:
                    print(f"  -> 저장 실패(Unknown): {abs_crop_path}")
            except Exception as e:
                print(f"  -> 저장 실패: {e}")
            crop_paths.append(crop_path)
        print(f"✂️ {len(crop_paths)}개 QNA 박스 크롭 완료")
        return crop_paths


# 싱글톤 인스턴스
yolo_service = YOLOService() 