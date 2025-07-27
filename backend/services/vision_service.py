"""
OpenAI GPT-4o-mini Vision API 서비스 (최적화 버전)
시험지 이미지/PDF에서 텍스트와 문제번호를 인식
Rate limit 최적화 및 에러 처리 강화
"""

import os
import openai
import asyncio
import time
import json
import base64
import re
import random
from typing import List, Dict, Any, Optional
from PIL import Image
from pathlib import Path
import fitz  # PyMuPDF for PDF processing

class VisionService:
    """OpenAI GPT-4o-mini Vision API를 사용한 시험지 분석 서비스"""
    
    def __init__(self):
        # OpenAI 클라이언트 초기화 (더 보수적인 설정)
        self.client = openai.AsyncOpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            max_retries=0  # 수동으로 처리하므로 0으로 설정
        )
        
        # 지원하는 이미지 형식
        self.supported_image_formats = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
        
        # Rate limiting을 위한 요청 간격 (초) - 더 보수적으로 설정
        self.request_interval = 12.0  # 12초 간격 (분당 5회) - 매우 보수적
        self.last_request_time = 0
        
        # 동시 요청 제한 (세마포어) - 더 보수적으로 설정
        self.request_semaphore = asyncio.Semaphore(1)  # 최대 1개 동시 요청 (순차 처리)
        
        # Rate limit 카운터
        self.rate_limit_count = 0
        self.last_rate_limit_time = 0
        
        # 토큰 사용량 추적
        self.token_usage = {"input": 0, "output": 0, "total": 0}

    async def _wait_for_rate_limit(self):
        """Rate limit 준수를 위한 대기 (강화된 버전)"""
        current_time = time.time()
        
        # 기본 요청 간격 대기
        elapsed = current_time - self.last_request_time
        if elapsed < self.request_interval:
            wait_time = self.request_interval - elapsed
            print(f"⏳ 기본 Rate limit 준수 대기: {wait_time:.1f}초")
            await asyncio.sleep(wait_time)
        
        # Rate limit 발생 시 추가 대기
        if self.rate_limit_count > 0:
            # Rate limit이 발생한 지 1분 이내면 추가 대기
            time_since_last_rate_limit = current_time - self.last_rate_limit_time
            if time_since_last_rate_limit < 60:
                additional_wait = 15  # 15초 추가 대기
                print(f"🚫 Rate limit 이력으로 인한 추가 대기: {additional_wait}초")
                await asyncio.sleep(additional_wait)
            else:
                # 1분이 지나면 카운터 리셋
                self.rate_limit_count = 0
                print("✅ Rate limit 카운터 리셋")
        
        self.last_request_time = time.time()

    def _log_token_usage(self, usage_data):
        """토큰 사용량 로깅 및 추적"""
        try:
            input_tokens = usage_data.prompt_tokens if hasattr(usage_data, 'prompt_tokens') else 0
            output_tokens = usage_data.completion_tokens if hasattr(usage_data, 'completion_tokens') else 0
            total_tokens = usage_data.total_tokens if hasattr(usage_data, 'total_tokens') else 0
            
            # 누적 토큰 사용량 업데이트
            self.token_usage["input"] += input_tokens
            self.token_usage["output"] += output_tokens
            self.token_usage["total"] += total_tokens
            
            # 상세 로깅
            print(f"🔢 토큰 사용량 - 입력: {input_tokens:,}, 출력: {output_tokens:,}, 총합: {total_tokens:,}")
            print(f"📊 누적 토큰 - 총 {self.token_usage['total']:,} 토큰 사용")
            
            # 비용 추정 (GPT-4o-mini 기준: $0.00015/1K input, $0.0006/1K output)
            input_cost = (input_tokens / 1000) * 0.00015
            output_cost = (output_tokens / 1000) * 0.0006
            total_cost = input_cost + output_cost
            
            print(f"💰 예상 비용: ${total_cost:.4f} (입력: ${input_cost:.4f}, 출력: ${output_cost:.4f})")
            
        except Exception as e:
            print(f"⚠️ 토큰 사용량 로깅 실패: {e}")

    def _is_pdf(self, file_path: str) -> bool:
        """PDF 파일인지 확인"""
        return Path(file_path).suffix.lower() == '.pdf'
    
    def _is_image(self, file_path: str) -> bool:
        """이미지 파일인지 확인"""
        return Path(file_path).suffix.lower() in self.supported_image_formats

    def _pdf_to_images(self, pdf_path: str, output_dir: Optional[str] = None) -> List[str]:
        """PDF를 이미지로 변환"""
        if output_dir is None:
            output_dir = Path(pdf_path).parent
        
        output_dir = Path(output_dir)
        output_dir.mkdir(exist_ok=True)
        
        base_name = Path(pdf_path).stem
        image_paths = []
        
        try:
            print(f"📄 PDF 변환 시작: {pdf_path}")
            pdf_document = fitz.open(pdf_path)
            
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]
                
                # 고해상도로 렌더링 (300 DPI)
                mat = fitz.Matrix(300/72, 300/72)  # 300 DPI scaling
                pix = page.get_pixmap(matrix=mat)
                
                # 이미지 저장
                image_path = output_dir / f"{base_name}_page_{page_num + 1}.png"
                pix.save(str(image_path))
                image_paths.append(str(image_path))
                
                print(f"   ✅ 페이지 {page_num + 1} 변환 완료: {image_path.name}")
            
            pdf_document.close()
            print(f"🎉 PDF 변환 완료: {len(image_paths)}개 페이지")
            return image_paths
            
        except Exception as e:
            print(f"❌ PDF 변환 실패: {e}")
            return []

    def _prepare_file_for_processing(self, file_path: str) -> List[str]:
        """파일을 처리 가능한 이미지로 준비"""
        if self._is_image(file_path):
            return [file_path]
        elif self._is_pdf(file_path):
            return self._pdf_to_images(file_path)
        else:
            raise ValueError(f"지원되지 않는 파일 형식: {file_path}")

    def _image_to_base64(self, image_path: str) -> str:
        """이미지를 base64로 변환"""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')

    def _resize_image_if_needed(self, image_path: str, max_size: int = 1024) -> str:
        """이미지 크기 조정 (토큰 절약을 위해 더 작게)"""
        try:
            with Image.open(image_path) as img:
                width, height = img.size
                
                # 더 작은 크기로 제한 (토큰 절약)
                if width > max_size or height > max_size:
                    # 비율 유지하면서 크기 조정
                    if width > height:
                        new_width = max_size
                        new_height = int(height * (max_size / width))
                    else:
                        new_height = max_size
                        new_width = int(width * (max_size / height))
                    
                    # 리사이즈
                    resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    
                    # 임시 파일로 저장
                    temp_path = f"{image_path}_resized.jpg"
                    resized_img.save(temp_path, "JPEG", quality=85, optimize=True)
                    
                    print(f"   📏 이미지 크기 조정: ({width}, {height}) → ({new_width}, {new_height})")
                    return temp_path
                else:
                    return image_path
        except Exception as e:
            print(f"   ⚠️ 이미지 리사이즈 실패: {e}")
            return image_path

    def _estimate_image_tokens(self, image_path: str) -> int:
        """이미지 토큰 수 대략 추정"""
        try:
            with Image.open(image_path) as img:
                width, height = img.size
                # OpenAI의 토큰 계산 방식 근사치
                # 512x512 = 85 토큰 (low detail)
                # high detail: 85 + (tiles * 170)
                base_tokens = 85
                
                if max(width, height) > 512:
                    # High detail mode 예상
                    tiles = ((width + 511) // 512) * ((height + 511) // 512)
                    estimated_tokens = base_tokens + (tiles * 170)
                else:
                    estimated_tokens = base_tokens
                
                print(f"🔢 예상 이미지 토큰: {estimated_tokens}")
                return estimated_tokens
        except:
            return 500  # 기본값

    async def _call_gpt4o_vision(self, prompt: str, image_path: str, retry_count: int = 5) -> str:
        """GPT-4o-mini Vision API 호출 (개선된 에러 처리)"""
        # 세마포어로 동시 요청 제한
        async with self.request_semaphore:
            # Rate limit 준수
            await self._wait_for_rate_limit()
            
            # 이미지 준비
            resized_path = self._resize_image_if_needed(image_path)
            base64_image = self._image_to_base64(resized_path)
            
            # 예상 토큰 확인
            estimated_tokens = self._estimate_image_tokens(resized_path)
            if estimated_tokens > 5000:
                print(f"⚠️ 큰 이미지 감지 ({estimated_tokens} 토큰 예상). 처리 시간이 오래 걸릴 수 있습니다.")
            
            messages = [
                {
                    "role": "system", 
                    "content": "You are a helpful assistant for Korean exam paper OCR and grading. Provide accurate, concise responses in JSON format only."
                },
                {
                    "role": "user", 
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url", 
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "high"  # 정확도를 위해 high detail 사용
                            }
                        }
                    ]
                }
            ]
            
            for attempt in range(retry_count):
                try:
                    print(f"🔄 API 호출 시도 {attempt + 1}/{retry_count}")
                    
                    response = await self.client.chat.completions.create(
                        model="gpt-4o-mini",  # GPT-4o-mini 사용 (비전 지원 + 높은 rate limit)
                        messages=messages,
                        max_tokens=2048,
                        temperature=0.0
                    )
                    
                    # 토큰 사용량 로깅
                    if hasattr(response, 'usage'):
                        self._log_token_usage(response.usage)
                    
                    content = response.choices[0].message.content
                    print(f"✅ API 호출 성공")
                    return content
                    
                except openai.RateLimitError as e:
                    # Rate limit 카운터 증가
                    self.rate_limit_count += 1
                    self.last_rate_limit_time = time.time()
                    
                    # Exponential backoff with jitter - 매우 보수적인 대기 시간
                    base_wait = 10 ** (attempt + 1)  # 10, 100, 1000초... (더 보수적)
                    jitter = random.uniform(0.8, 1.2)
                    wait_time = min(base_wait * jitter, 300)  # 최대 300초(5분)로 제한
                    
                    print(f"🚫 Rate Limit 오류 (발생 횟수: {self.rate_limit_count}): {wait_time:.1f}초 대기... ({attempt + 1}/{retry_count})")
                    
                    # Rate limit 헤더에서 retry-after 시간 확인
                    if hasattr(e, 'response') and e.response and 'retry-after' in e.response.headers:
                        retry_after = int(e.response.headers['retry-after'])
                        if retry_after > 0:
                            wait_time = max(wait_time, retry_after)
                            print(f"📋 서버 권장 대기 시간: {retry_after}초")
                    
                    await asyncio.sleep(wait_time)
                    
                    # Rate limit 후 추가 대기
                    if attempt < retry_count - 1:
                        additional_wait = 20  # 20초 추가 대기
                        print(f"⏳ Rate limit 후 추가 대기: {additional_wait}초")
                        await asyncio.sleep(additional_wait)
                    
                except openai.APIError as e:
                    if "context_length_exceeded" in str(e):
                        print(f"❌ 컨텍스트 길이 초과. 이미지 크기를 줄여보세요.")
                        return json.dumps({"error": "context_length_exceeded", "details": str(e)})
                    
                    print(f"🔧 API 오류: {e}. 재시도 중... ({attempt + 1}/{retry_count})")
                    if attempt == retry_count - 1:
                        return json.dumps({"error": "API_error", "details": str(e)})
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    print(f"⚠️ 알 수 없는 오류: {e}. 재시도 중... ({attempt + 1}/{retry_count})")
                    if attempt == retry_count - 1:
                        return json.dumps({"error": "unknown_error", "details": str(e)})
                    await asyncio.sleep(2)
            
            return json.dumps({"error": "max_retries_exceeded"})

    def _parse_json(self, text: str) -> dict:
        """강화된 JSON 파싱"""
        if not text or not text.strip():
            return {"error": "empty_response"}
        
        try:
            # 직접 JSON 파싱 시도
            return json.loads(text)
        except json.JSONDecodeError:
            # Markdown 코드블록 제거
            try:
                cleaned_text = re.sub(r'^```json\s*', '', text.strip())
                cleaned_text = re.sub(r'\s*```$', '', cleaned_text)
                return json.loads(cleaned_text)
            except json.JSONDecodeError:
                # JSON 객체 추출 시도
                json_match = re.search(r'\{[\s\S]*\}', text)
                if json_match:
                    try:
                        return json.loads(json_match.group(0))
                    except json.JSONDecodeError:
                        pass
                
                # 최후의 수단: 원본 텍스트 반환
                print(f"⚠️ JSON 파싱 실패. 원본 텍스트: {text[:200]}...")
                return {"raw_response": text, "parse_error": True}

    def get_smart_analysis_prompt(self, ocr_text: str, nearby_checks: list) -> str:
        """최적화된 분석 프롬프트"""
        return f"""
한국어 시험지 이미지를 분석하여 다음 정보를 추출하세요.

추가 정보:
- OCR 텍스트: "{ocr_text}"
- 주변 체크마크 수: {len(nearby_checks)}

다음 JSON 형식으로 응답하세요 (코드블록 없이):
{{
    "question_number": 문제번호 (숫자),
    "question_text": "문제 텍스트 전체",
    "question_type": "multiple_choice|short_answer|essay",
    "detected_answer": "학생 답안 (객관식은 번호, 주관식은 텍스트)",
    "confidence": "high|medium|low"
}}

주의사항:
1. 문제번호는 반드시 숫자로 추출
2. 학생이 선택한 답안을 정확히 인식
3. 불확실한 경우 confidence를 "low"로 설정
"""

    def is_multiple_choice_by_answer(self, answer: str) -> bool:
        """답안 형태로 객관식 여부 판단"""
        if not answer:
            return False
        
        # 숫자나 알파벳 하나인 경우 객관식으로 판단
        answer_str = str(answer).strip()
        return (answer_str.isdigit() and len(answer_str) == 1) or \
               (answer_str.isalpha() and len(answer_str) == 1)

    async def analyze_question_smart(self, image_path: str, nearby_checks: list, fallback_num: int) -> dict:
        """YOLO 좌표 기반 스마트 분석"""
        print(f"🔍 문제 분석 중: {os.path.basename(image_path)}")
        
        prompt = self.get_smart_analysis_prompt("", nearby_checks)
        response_str = await self._call_gpt4o_vision(prompt, image_path)
        result = self._parse_json(response_str)

        if 'error' in result:
            print(f"❌ 분석 실패: {result['error']}")
            return result

        # 문제 번호 후처리
        if not result.get('question_number'):
            result['question_number'] = fallback_num
            print(f"📝 대체 문제번호 사용: {fallback_num}")

        # 답안 형태 기반 문제 유형 보정
        detected_answer = result.get('detected_answer')
        if detected_answer and result.get('confidence') != 'high':
            if self.is_multiple_choice_by_answer(detected_answer):
                result['question_type'] = 'multiple_choice'
                print(f"🔧 객관식으로 보정: 답안 '{detected_answer}'")

        print(f"✅ 문제 {result.get('question_number')}번 분석 완료")
        return result

    async def analyze_exam_paper_vision(self, image_path: str, yolo_results: dict) -> dict:
        """
        문제번호 매칭 개선된 시험지 비전 분석
        """
        start = time.time()
        print(f"📄 시험지 분석 시작: {os.path.basename(image_path)}")
        
        # 헤더 정보 추출
        header_prompt = (
            "이 한국 수능/모의고사 시험지에서 상단 헤더 정보만 추출하세요. "
            "연도, 월, 과목, 시험유형(모의평가/수능)을 찾아서 아래 JSON으로만 응답하세요 (코드블록 없이):\n"
            '{ "header": { "year": "2024", "month": "9", "subject": "영어", "exam_type": "모의평가" } }'
        )
        header_response = await self._call_gpt4o_vision(header_prompt, image_path)
        print(f"[헤더 GPT 응답] {header_response}")
        header_info = self._parse_json(header_response).get('header', {})
        
        questions = []
        question_number_map = {}  # 실제 문제번호 -> 크롭 인덱스 매핑
        qna_crop_paths = yolo_results.get('qna_crops', [])
        
        if qna_crop_paths:
            print(f"📋 총 {len(qna_crop_paths)}개 문제 분석 시작")
            
            # 1단계: 모든 크롭에서 문제번호 추출
            crop_question_numbers = []
            for idx, crop_path in enumerate(qna_crop_paths):
                print(f"\n🔍 크롭 {idx+1} 문제번호 추출 중...")
                
                # 개선된 문제번호 추출
                number_prompt = (
                    "이 이미지에서 문제번호를 정확히 추출하세요. "
                    "텍스트 맨 앞에 있는 '숫자.' 형태의 문제번호를 찾아주세요. "
                    "예: '4. 대화를 듣고...' → 4번, '12. 다음을 읽고...' → 12번 "
                    "그림 안의 (1), (2), (3) 같은 번호는 무시하고, 문제번호만 찾으세요. "
                    "{ \"question_number\": 4 } 형식으로만 응답하세요."
                )
                number_response = await self._call_gpt4o_vision(number_prompt, crop_path)
                number_result = self._parse_json(number_response)
                
                detected_number = number_result.get('question_number')
                if detected_number and isinstance(detected_number, int):
                    crop_question_numbers.append((idx, detected_number, crop_path))
                    question_number_map[detected_number] = idx
                    print(f"   ✅ 크롭 {idx+1} -> 문제 {detected_number}번")
                else:
                    # 정규표현식으로 재시도 (개선된 패턴)
                    basic_result = await self.analyze_with_general_gpt(crop_path)
                    ocr_text = basic_result.get('ocr_text', '')
                    extracted_num = self.extract_question_number(ocr_text)
                    if extracted_num:
                        crop_question_numbers.append((idx, extracted_num, crop_path))
                        question_number_map[extracted_num] = idx
                        print(f"   ✅ 크롭 {idx+1} -> 문제 {extracted_num}번 (정규표현식)")
                    else:
                        crop_question_numbers.append((idx, idx+1, crop_path))  # 폴백
                        print(f"   ⚠️ 크롭 {idx+1} -> 문제 {idx+1}번 (폴백)")
            
            # 2단계: 문제번호 순서로 정렬하여 분석
            crop_question_numbers.sort(key=lambda x: x[1])  # 문제번호 기준 정렬
            
            for sequence_idx, (crop_idx, question_num, crop_path) in enumerate(crop_question_numbers):
                print(f"\n🔄 문제 {question_num}번 분석 중... (크롭 {crop_idx+1})")
                
                # YOLO 체크마크 정보
                nearby_checks = []
                if yolo_results and 'checks' in yolo_results:
                    nearby_checks = yolo_results['checks']
                
                # 스마트 분석
                question_result = await self.analyze_question_smart(crop_path, nearby_checks, question_num)
                
                # 결과 정리
                question_result['crop_index'] = crop_idx + 1
                question_result['question_number'] = question_num
                question_result['sequence_order'] = sequence_idx + 1
                
                # 크롭 파일명 정리 (문제번호 기반)
                orig_path = Path(crop_path)
                new_filename = f"{orig_path.stem.split('_qna_tmp')[0]}_qna_{question_num}.jpg"
                new_path = orig_path.parent / new_filename
                
                try:
                    if not new_path.exists() and orig_path.exists():
                        os.rename(str(orig_path), str(new_path))
                        print(f"📝 크롭 파일명 변경: {orig_path.name} → {new_filename}")
                    question_result['crop_path'] = str(new_path)
                except Exception as e:
                    print(f"⚠️ 파일명 변경 실패: {e}")
                    question_result['crop_path'] = str(orig_path)
                
                questions.append(question_result)
                
                detected_answer = question_result.get('detected_answer')
                print(f"✅ 문제 {question_num}번 완료: {detected_answer if detected_answer else 'None'}")
        
        # 3단계: 최종 정답 배열 생성 (문제번호 순서 보장)
        questions.sort(key=lambda q: q.get('question_number', 999))
        student_answers = []
        for question in questions:
            answer = question.get('detected_answer')
            student_answers.append(answer)
        
        result = {
            "header": header_info,
            "questions": questions,
            "student_answers": student_answers,
            "question_number_mapping": question_number_map,
            "processing_time": round(time.time() - start, 2),
            "filename": os.path.basename(image_path),
            "total_questions": len(questions)
        }
        
        print(f"📊 최종 학생 답안 (문제번호 순서): {student_answers}")
        print(f"🗺️ 문제번호 매핑: {question_number_map}")
        print(f"⏱️ 전체 처리 시간: {result['processing_time']}초")
        
        return result

    def _update_crop_filename(self, crop_path: str, question_num: int, question_result: dict):
        """크롭 파일명 업데이트"""
        try:
            orig_path = Path(crop_path)
            base_name = orig_path.stem.split('_qna_tmp')[0]
            new_filename = f"{base_name}_qna_{question_num}.jpg"
            new_path = orig_path.parent / new_filename
            
            if not new_path.exists() and orig_path.exists():
                os.rename(str(orig_path), str(new_path))
                question_result['crop_path'] = str(new_path)
            else:
                question_result['crop_path'] = str(orig_path)
                
        except Exception as e:
            print(f"   ⚠️ 파일명 변경 실패: {e}")
            question_result['crop_path'] = crop_path

    def _build_final_result(self, questions: list, header_info: dict, start_time: float) -> dict:
        """최종 결과 구성"""
        student_answers = []
        question_number_mapping = {}
        
        for i, question in enumerate(questions):
            answer = question.get('detected_answer')
            question_num = question.get('question_number', i + 1)
            student_answers.append(answer)
            question_number_mapping[str(question_num)] = i

        processing_time = round(time.time() - start_time, 2)
        
        return {
            "header": header_info,
            "questions": questions,
            "student_answers": student_answers,
            "question_number_mapping": question_number_mapping,
            "processing_time": processing_time,
            "total_questions": len(questions),
            "token_usage": self.token_usage.copy()
        }

    def _print_analysis_summary(self, result: dict):
        """분석 결과 요약 출력"""
        print(f"\n🎉 시험지 분석 완료!")
        print(f"⏱️ 처리 시간: {result['processing_time']}초")
        print(f"📝 총 문제 수: {result['total_questions']}")
        print(f"🔢 총 토큰 사용량: {result['token_usage']['total']}")
        
        # 문제 유형별 통계
        question_types = {}
        for q in result['questions']:
            qtype = q.get('question_type', 'unknown')
            question_types[qtype] = question_types.get(qtype, 0) + 1
        
        print(f"📊 문제 유형 분포: {question_types}")

    async def analyze_answer_sheet(self, file_path: str) -> dict:
        """정답지 분석 - PDF/이미지 모두 지원"""
        print(f"📋 정답지 분석 시작: {os.path.basename(file_path)}")
        
        try:
            image_paths = self._prepare_file_for_processing(file_path)
            if not image_paths:
                raise ValueError("파일 처리 실패")
            
            # 첫 번째 페이지 분석
            main_image_path = image_paths[0]
            
            prompt = (
                "이 이미지는 한국 모의고사/수능 정답지입니다. "
                "각 문제번호와 해당 정답을 정확히 추출하여 JSON 객체로 제공하세요.\n\n"
                "분석 방법:\n"
                "1. 문제번호를 찾아서 (01번, 02번, 03번... 또는 1번, 2번, 3번...) 확인\n"
                "2. 각 문제의 정답 번호를 찾아서 (1, 2, 3, 4, 5 중 하나) 추출\n"
                "3. 정답이 표시된 방식: ①, ②, ③, ④, ⑤ 또는 1, 2, 3, 4, 5 또는 체크표시\n"
                "4. 문제번호를 키로, 정답을 값으로 하는 객체 생성\n\n"
                "예시 답안지 형식:\n"
                "01. ③ → {\"1\": 3}\n"
                "02. ① → {\"2\": 1}\n"
                "03. ② → {\"3\": 2}\n\n"
                "응답 형식: {\"answer_mapping\": {\"1\": 3, \"2\": 1, \"3\": 2, \"4\": 3, \"5\": 4, \"6\": 3, \"7\": 2, \"8\": 4, \"9\": 5, \"10\": 5, \"11\": 4, \"12\": 1}}\n"
                "주의: 코드블록 없이 JSON만 응답하세요. 모든 문제번호와 정답을 찾아서 매핑하세요."
            )
            
            gpt_response = await self._call_gpt4o_vision(prompt, main_image_path)
            print(f"📄 정답지 GPT 응답 받음")
            print(f"🔍 GPT 원본 응답: {gpt_response[:500]}...")
            
            parsed = self._parse_json(gpt_response)
            parsed['file_type'] = "PDF" if self._is_pdf(file_path) else "Image"
            parsed['processing_time'] = time.time()
            
            # 정답 매핑 확인
            if 'answer_mapping' in parsed and isinstance(parsed['answer_mapping'], dict) and parsed['answer_mapping']:
                answer_mapping = parsed['answer_mapping']
                print(f"✅ 정답 매핑 {len(answer_mapping)}개 추출 완료")
                print(f"📊 추출된 정답 매핑: {answer_mapping}")
                
                # 기존 호환성을 위해 배열 형태도 추가
                max_question = max([int(k) for k in answer_mapping.keys()]) if answer_mapping else 0
                answers_array = []
                for i in range(1, max_question + 1):
                    answers_array.append(str(answer_mapping.get(str(i), 'N/A')))
                parsed['answers'] = answers_array
                print(f"📋 변환된 정답 배열: {answers_array}")
            else:
                print(f"⚠️ 정답 매핑 추출 실패 - 기존 배열 방식으로 재시도")
                print(f"🔍 파싱된 결과: {parsed}")
                
                # 기존 배열 방식으로 fallback
                fallback_prompt = (
                    "이 이미지는 한국 모의고사/수능 정답지입니다. "
                    "각 문제의 정답 번호를 순서대로 추출하여 JSON 배열로 제공하세요.\n\n"
                    "분석 방법:\n"
                    "1. 문제번호를 찾아서 (1번, 2번, 3번...) 순서대로 확인\n"
                    "2. 각 문제의 정답 번호를 찾아서 (1, 2, 3, 4, 5 중 하나) 추출\n"
                    "3. 정답이 표시된 방식: ①, ②, ③, ④, ⑤ 또는 1, 2, 3, 4, 5\n"
                    "4. 모든 문제의 정답을 순서대로 배열에 담기\n\n"
                    "응답 형식: {\"answers\": [3, 1, 2, 3, 4, 3, 2, 4, 5, 5, 4, 1]}\n"
                    "주의: 코드블록 없이 JSON만 응답하세요."
                )
                
                try:
                    fallback_response = await self._call_gpt4o_vision(fallback_prompt, main_image_path)
                    fallback_parsed = self._parse_json(fallback_response)
                    if 'answers' in fallback_parsed and isinstance(fallback_parsed['answers'], list):
                        parsed['answers'] = fallback_parsed['answers']
                        print(f"✅ Fallback 성공: {len(parsed['answers'])}개 정답 추출")
                    else:
                        parsed['answers'] = []
                        print(f"❌ Fallback도 실패")
                except Exception as e:
                    print(f"❌ Fallback 중 오류: {e}")
                    parsed['answers'] = []
            
            return parsed
            
        except Exception as e:
            print(f"❌ 정답지 분석 실패: {e}")
            return {"error": str(e)}

    def get_usage_summary(self) -> dict:
        """토큰 사용량 요약"""
        return {
            "total_tokens": self.token_usage["total"],
            "input_tokens": self.token_usage["input"],
            "output_tokens": self.token_usage["output"],
            "estimated_cost_usd": self.token_usage["total"] * 0.00015  # GPT-4o-mini 평균 요금
        }

    # 📁 VisionService의 analyze_exam_images 메서드를 이것으로 완전히 교체하세요

    async def analyze_exam_images(self, crop_images: List[str], 
                                answer_sheet_path: str = None, 
                                listening_script_path: str = None,
                                token_saving_mode: bool = True,
                                progress_callback=None) -> List[dict]:
        """
        🚀 토큰 절약 모드가 적용된 시험지 분석 메인 메서드 (WebSocket 진행률 포함)
        - answer_sheet_path: 답안지가 있으면 크롤링 생략
        - listening_script_path: 대본이 있으면 자동 인식 생략
        - progress_callback: WebSocket 진행률 콜백 함수
        """
        
        # 📊 진행률 업데이트 헬퍼 함수
        async def update_progress(percentage: int, message: str):
            if progress_callback:
                await progress_callback(percentage, message)
            print(f"📊 진행률: {percentage}% - {message}")
        
        await update_progress(0, "분석을 시작합니다...")
        
        print(f"📋 시험지 분석 시작 (토큰 절약 모드: {token_saving_mode})")
        print(f"🔢 분석할 이미지 수: {len(crop_images)}")
        
        # 🔧 토큰 절약 정보 로깅
        token_saving_info = {
            "answer_sheet_provided": answer_sheet_path is not None,
            "listening_script_provided": listening_script_path is not None,
            "estimated_token_savings": "0%"
        }
        
        # 🔧 정답지 분석 (답안지가 있는 경우)
        correct_answers = {}
        if answer_sheet_path and token_saving_mode:
            await update_progress(10, "답안지를 분석하고 있습니다...")
            print(f"💡 답안지 제공됨: {os.path.basename(answer_sheet_path)} - 크롤링 생략!")
            token_saving_info["estimated_token_savings"] = "50-70%"
            
            try:
                print(f"📋 정답지 분석 중...")
                answer_sheet_result = await self.analyze_answer_sheet(answer_sheet_path)
                
                if 'answer_mapping' in answer_sheet_result and isinstance(answer_sheet_result['answer_mapping'], dict):
                    # 정답 매핑을 그대로 사용
                    answer_mapping = answer_sheet_result['answer_mapping']
                    for question_num, answer in answer_mapping.items():
                        correct_answers[int(question_num)] = str(answer)
                elif 'answers' in answer_sheet_result and isinstance(answer_sheet_result['answers'], list):
                    # 기존 호환성을 위해 배열 형태도 지원
                    for i, answer in enumerate(answer_sheet_result['answers']):
                        correct_answers[i + 1] = str(answer)
                    
                    await update_progress(25, f"정답지에서 {len(correct_answers)}개 정답 추출 완료")
                    print(f"✅ 정답지에서 {len(correct_answers)}개 정답 추출 완료")
                    print(f"📊 추출된 정답 예시: {dict(list(correct_answers.items())[:5])}")
                else:
                    await update_progress(15, "정답지 분석 실패 - 크롤링으로 fallback")
                    print(f"⚠️ 정답지 분석 실패 - 크롤링으로 fallback")
                    
            except Exception as e:
                await update_progress(15, f"답안지 분석 오류: {str(e)}")
                print(f"❌ 정답지 분석 오류: {e} - 크롤링으로 fallback")
        else:
            await update_progress(10, "크롤링으로 정답을 찾고 있습니다...")
            print("🔍 크롤링으로 정답 검색 중...")

        # 🔧 대본 내용 추출 (대본이 있는 경우)
        listening_script_content = None
        if listening_script_path and token_saving_mode:
            await update_progress(30, "듣기 대본을 로드하고 있습니다...")
            print(f"🎧 대본 제공됨: {os.path.basename(listening_script_path)} - 자동 인식 생략!")
            
            current_savings = token_saving_info["estimated_token_savings"]
            if current_savings != "0%":
                token_saving_info["estimated_token_savings"] = "70-90%"
            else:
                token_saving_info["estimated_token_savings"] = "20-30%"
            
            try:
                print(f"🎧 대본 파일 읽기 중...")
                
                if listening_script_path.lower().endswith('.txt'):
                    # 텍스트 파일 직접 읽기
                    with open(listening_script_path, 'r', encoding='utf-8') as f:
                        listening_script_content = f.read()
                        await update_progress(35, f"텍스트 대본 로드 완료 ({len(listening_script_content)}자)")
                        print(f"✅ 텍스트 대본 로드 완료 ({len(listening_script_content)}자)")
                        
                elif listening_script_path.lower().endswith('.pdf'):
                    # PDF에서 텍스트 추출
                    listening_script_content = await self._extract_text_from_pdf(listening_script_path)
                    await update_progress(35, f"PDF 대본 로드 완료 ({len(listening_script_content or '')}자)")
                    print(f"✅ PDF 대본 로드 완료 ({len(listening_script_content or '')}자)")
                    
                else:
                    await update_progress(32, f"지원되지 않는 대본 형식: {listening_script_path}")
                    print(f"⚠️ 지원되지 않는 대본 형식: {listening_script_path}")
                    
            except Exception as e:
                await update_progress(32, f"대본 로드 오류: {str(e)}")
                print(f"❌ 대본 로드 오류: {e}")
        
        print(f"💰 예상 토큰 절약: {token_saving_info['estimated_token_savings']}")

        # 🔧 크롭 이미지별 분석
        await update_progress(40, "시험지 이미지를 분석하고 있습니다...")
        
        results = []
        total_images = len(crop_images)
        
        for idx, crop_path in enumerate(crop_images):
            # 개별 이미지 진행률 계산 (40% ~ 80% 구간 사용)
            image_progress = 40 + int((idx / total_images) * 40)
            await update_progress(image_progress, f"이미지 {idx+1}/{total_images} 분석 중...")
            
            print(f"\n🔄 [{idx + 1}/{len(crop_images)}] 문제 영역 분석 중...")
            
            try:
                # 🔧 토큰 절약 프롬프트 생성
                analysis_prompt = self._get_token_saving_prompt(
                    question_number=idx + 1,
                    correct_answers=correct_answers,
                    listening_script=listening_script_content,
                    token_saving_mode=token_saving_mode
                )
                
                # Vision API 호출
                response_str = await self._call_gpt4o_vision(analysis_prompt, crop_path)
                result = self._parse_json(response_str)
                
                if 'error' in result:
                    await update_progress(image_progress, f"문제 {idx+1} 분석 실패: {result['error']}")
                    print(f"❌ 문제 {idx + 1} 분석 실패: {result['error']}")
                    continue
                
                # 결과 후처리
                result['question_number'] = result.get('question_number', idx + 1)
                result['crop_path'] = crop_path
                result['token_saving_applied'] = token_saving_info
                
                # 정답지 정보가 있다면 추가
                if correct_answers.get(idx + 1):
                    result['correct_answer'] = correct_answers[idx + 1]
                    result['is_correct'] = str(result.get('detected_answer', '')).strip() == str(correct_answers[idx + 1]).strip()
                
                completed_progress = 40 + int(((idx + 1) / total_images) * 40)
                await update_progress(completed_progress, f"이미지 {idx+1}/{total_images} 분석 완료")
                
                print(f"✅ 문제 {result['question_number']}번 완료 - 답안: '{result.get('detected_answer', 'N/A')}'")
                results.append(result)
                
            except Exception as e:
                await update_progress(image_progress, f"문제 {idx+1} 분석 중 오류: {str(e)}")
                print(f"❌ 문제 {idx + 1} 분석 중 오류: {e}")
                continue
        
        # 🔄 결과 정리
        await update_progress(85, "결과를 정리하고 있습니다...")
        
        await update_progress(95, "분석이 거의 완료되었습니다...")
        
        await update_progress(100, "모든 분석이 완료되었습니다!")
        
        print(f"\n🎉 분석 완료: {len(results)}/{len(crop_images)}개 성공")
        print(f"💰 토큰 절약 효과: {token_saving_info['estimated_token_savings']}")
        
        return results  # 기존 형식과 호환성을 위해 results만 반환

    def _get_token_saving_prompt(self, question_number: int, correct_answers: dict, 
                                listening_script: str = None, token_saving_mode: bool = True) -> str:
        """토큰 절약 모드에 맞는 프롬프트 생성"""
        
        base_prompt = f"""
한국어 시험지 이미지에서 문제 {question_number}번을 분석하세요.

다음 JSON 형식으로 응답하세요 (코드블록 없이):
{{
    "question_number": {question_number},
    "question_text": "문제 텍스트",
    "question_type": "multiple_choice|short_answer|essay",
    "detected_answer": "학생이 선택/작성한 답안",
    "confidence": "high|medium|low"
}}"""

        # 🔧 정답지 정보가 있으면 추가
        if correct_answers.get(question_number):
            correct_answer = correct_answers[question_number]
            base_prompt += f"""

💡 참고: 이 문제의 정답은 '{correct_answer}'입니다. (크롤링 생략됨)
학생 답안과 정답을 비교하여 정확성을 확인하세요."""

        # 🔧 대본 정보가 있으면 추가 (영어듣기 문제인 경우)
        if listening_script and "listening" in listening_script.lower():
            base_prompt += f"""

🎧 영어듣기 대본 제공됨 (자동 인식 생략):
{listening_script[:500]}...

위 대본을 참고하여 듣기 문제 분석에 활용하세요."""

        base_prompt += """

주의사항:
1. 학생이 실제로 선택/작성한 답안을 정확히 인식
2. 정답 정보가 제공된 경우 크롤링 과정 생략
3. 불확실한 경우 confidence를 "low"로 설정"""

        return base_prompt

    async def _extract_text_from_pdf(self, pdf_path: str) -> str:
        """PDF에서 텍스트 추출"""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(pdf_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text.strip()
        except Exception as e:
            print(f"❌ PDF 텍스트 추출 실패: {e}")
            return ""

    # 🔧 기존 메서드 수정 - 토큰 절약 모드 적용
    async def analyze_exam_paper(self, image_path: str, *args, **kwargs) -> List[dict]:
        """
        기존 라우터와의 호환성을 위한 메인 분석 메서드 (토큰 절약 지원)
        """
        print(f"📋 시험지 분석 시작 (호환성 모드): {os.path.basename(image_path)}")
        
        # kwargs에서 토큰 절약 파라미터 추출
        answer_sheet_path = kwargs.get('answer_sheet_path')
        listening_script_path = kwargs.get('listening_script_path')
        token_saving_mode = kwargs.get('token_saving_mode', True)
        
        print(f"💡 토큰 절약 파라미터 확인:")
        print(f"   - 답안지: {'✅' if answer_sheet_path else '❌'}")
        print(f"   - 대본: {'✅' if listening_script_path else '❌'}")
        
        try:
            # 새로운 토큰 절약 메서드 호출
            results = await self.analyze_exam_images(
                crop_images=[image_path],
                answer_sheet_path=answer_sheet_path,
                listening_script_path=listening_script_path,
                token_saving_mode=token_saving_mode
            )
            
            print(f"✅ 토큰 절약 분석 완료: {len(results)}개 결과")
            return results
            
        except Exception as e:
            print(f"❌ 토큰 절약 분석 실패: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _convert_to_legacy_format(self, vision_results: dict) -> List[dict]:
        """
        새 형식의 결과를 기존 라우터가 기대하는 형식으로 변환
        """
        if not vision_results or 'questions' not in vision_results:
            return []
        
        legacy_results = []
        for question in vision_results.get('questions', []):
            legacy_item = {
                # 기존 라우터에서 기대하는 필드들
                'detected_question_number': question.get('question_number', 'N/A'),
                'full_text': question.get('question_text', ''),
                'confidence': question.get('confidence', 'medium'),
                'crop_path': question.get('crop_path', ''),
                'detected_answer': question.get('detected_answer', 'N/A'),
                'question_type': question.get('question_type', 'unknown'),
                
                # 추가 정보
                'processing_time': vision_results.get('processing_time', 0),
                'analysis_method': 'GPT-4o-mini Vision API'
            }
            legacy_results.append(legacy_item)
        
        return legacy_results

    async def analyze_with_general_gpt(self, image_path: str) -> dict:
        """일반적인 GPT 분석 (기존 호환성)"""
        prompt = """
        이 이미지를 분석하여 다음 정보를 JSON 형식으로 제공하세요:
        
        {
            "detected_text": "인식된 모든 텍스트",
            "question_count": 예상되는_문제_수,
            "type": "exam_paper|answer_sheet|other",
            "confidence": "high|medium|low"
        }
        """
        
        response_str = await self._call_gpt4o_vision(prompt, image_path)
        return self._parse_json(response_str)

    def extract_answer_from_result(self, result: dict) -> str:
        """결과에서 답안 추출 (기존 호환성)"""
        if not result:
            return "N/A"
        
        # 다양한 형태의 답안 추출 시도
        if isinstance(result, list) and result:
            result = result[0]  # 첫 번째 결과 사용
        
        if isinstance(result, dict):
            # 우선순위에 따른 답안 추출
            for key in ['detected_answer', 'user_answer', 'answer', 'detected_text']:
                if key in result and result[key]:
                    return str(result[key])
        
        return "N/A"

    def extract_question_number(self, ocr_text: str) -> Optional[int]:
        """OCR 텍스트에서 문제번호 추출 (강화된 정규표현식)"""
        if not ocr_text:
            return None
        
        # 문제번호 우선 패턴 (텍스트 맨 앞의 "숫자." 형태)
        question_patterns = [
            r"^\s*(\d{1,2})\s*\.",  # "4. 대화를 듣고..."
            r"^[^\d]*(\d{1,2})\s*\.",  # 앞의 특수문자 무시
            r"(\d{1,2})\.\s*[가-힣]",  # 한글 앞의 번호
            r"(\d{1,2})\.\s*[A-Za-z]",  # 영문 앞의 번호
        ]
        
        # 문제번호 후보 찾기
        question_candidates = []
        for pattern in question_patterns:
            matches = re.finditer(pattern, ocr_text)
            for match in matches:
                number = int(match.group(1))
                if 1 <= number <= 50:  # 유효한 문제번호 범위
                    question_candidates.append((number, match.start()))
        
        # 그림 안의 번호 패턴 (괄호 안의 숫자)
        picture_patterns = [
            r"\((\d{1,2})\)",  # "(1)", "(2)", "(3)"
            r"\(\s*(\d{1,2})\s*\)",  # "( 1 )", "( 2 )"
        ]
        
        # 그림 안의 번호들 찾기
        picture_numbers = set()
        for pattern in picture_patterns:
            matches = re.finditer(pattern, ocr_text)
            for match in matches:
                picture_numbers.add(int(match.group(1)))
        
        # 문제번호 후보 중에서 그림 안의 번호가 아닌 것 선택
        for number, position in question_candidates:
            if number not in picture_numbers:
                print(f"[문제번호 추출] 성공: {number} (위치: {position}, 그림번호 제외: {picture_numbers})")
                return number
        
        # 모든 후보가 그림 번호와 겹치면 첫 번째 후보 사용
        if question_candidates:
            number = question_candidates[0][0]
            print(f"[문제번호 추출] 첫 번째 후보 사용: {number} (그림번호와 겹침: {picture_numbers})")
            return number
        
        print(f"[문제번호 추출] 실패: ocr_text='{ocr_text[:100]}'")
        return None

# 글로벌 인스턴스
vision_service = VisionService()

# 테스트 함수
async def test_vision_service():
    """VisionService 테스트 - PDF/이미지 모두 지원"""
    print("--- 🧪 Vision Service 테스트 시작 ---")
    
    # API 키 존재 여부 확인
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ 에러: OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
        return
    print("✅ OPENAI_API_KEY 확인됨.")

    # Get the project root directory (assuming this script is in backend/services)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    print(f"📂 프로젝트 루트: {project_root}")
    test_files = [os.path.join(project_root, "test_exam.jpg")]
    
    for test_file in test_files:
        if not os.path.exists(test_file):
            print(f"❌ 테스트 파일이 없습니다: {test_file}")
            continue
        
        try:
            print(f"\n🧪 테스트 시작: {test_file}")
            
            if "answer" in test_file.lower():
                # 정답지 테스트
                result = await vision_service.analyze_answer_sheet(test_file)
                print(f"📋 정답지 분석 결과: {result.get('answers', [])[:5]}...")
            else:
                # 시험지 테스트 (YOLO 결과 없이 기본 테스트)
                fake_yolo_results = {"qna_crops": [test_file], "checks": []}
                result = await vision_service.analyze_exam_paper_vision(test_file, fake_yolo_results)
                print(f"📝 시험지 분석 결과: {len(result.get('questions', []))}개 문제")
            
            print(f"✅ 테스트 완료")
            
        except Exception as e:
            print(f"❌ 테스트 실패: {e}")
    
    # 사용량 요약
    usage = vision_service.get_usage_summary()
    print(f"\n💰 총 사용량: {usage}")

if __name__ == "__main__":
    asyncio.run(test_vision_service())
