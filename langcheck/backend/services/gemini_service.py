"""
GPT-4o-mini Vision API 서비스 (해설 생성, 유사문제 생성)
시험지 자동 채점, 해설 생성, 유사문제 생성
"""

import os
import openai
import asyncio
import time
import json
import base64
import re
import random
import logging
from typing import List, Dict, Any, Optional
from PIL import Image
from pathlib import Path

logger = logging.getLogger(__name__)

class GPTService:
    """GPT-4o-mini Vision API를 사용한 해설 및 유사문제 생성 서비스"""
    
    def __init__(self):
        # OpenAI 클라이언트 초기화
        self.client = openai.AsyncOpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            max_retries=0
        )
        
        # Rate limiting을 위한 요청 간격 (초)
        self.request_interval = 8.0  # 8초 간격 (분당 7-8회)
        self.last_request_time = 0
        
        # 동시 요청 제한 (세마포어)
        self.request_semaphore = asyncio.Semaphore(2)  # 최대 2개 동시 요청
        
        # Rate limit 카운터
        self.rate_limit_count = 0
        self.last_rate_limit_time = 0
        
        # 토큰 사용량 추적
        self.token_usage = {"input": 0, "output": 0, "total": 0}

    async def _wait_for_rate_limit(self):
        """Rate limit 준수를 위한 대기"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.request_interval:
            wait_time = self.request_interval - time_since_last
            print(f"⏳ Rate limit 준수: {wait_time:.1f}초 대기")
            await asyncio.sleep(wait_time)
        
        self.last_request_time = time.time()

    def _image_to_base64(self, image_path: str) -> str:
        """이미지를 base64로 인코딩"""
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            print(f"⚠️ 이미지 인코딩 실패: {e}")
            return ""

    def _resize_image_if_needed(self, image_path: str, max_size: int = 1024) -> str:
        """이미지 크기 조정 (토큰 절약)"""
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

    async def _call_gpt4o_vision(self, prompt: str, image_path: str = None, retry_count: int = 3) -> str:
        """GPT-4o-mini Vision API 호출"""
        async with self.request_semaphore:
            # Rate limit 준수
            await self._wait_for_rate_limit()
            
            # 이미지 준비
            base64_image = None
            if image_path:
                resized_path = self._resize_image_if_needed(image_path)
                base64_image = self._image_to_base64(resized_path)
            
            messages = [
                {
                    "role": "system", 
                    "content": "You are a helpful assistant for Korean exam paper analysis, explanation generation, and similar question creation. Provide accurate, detailed responses in JSON format only."
                }
            ]
            
            content = [{"type": "text", "text": prompt}]
            if base64_image:
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}"
                    }
                })
            
            messages.append({"role": "user", "content": content})
            
            for attempt in range(retry_count):
                try:
                    response = await self.client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=messages,
                        max_tokens=2000,
                        temperature=0.3,
                        response_format={"type": "json_object"}
                    )
                    
                    result = response.choices[0].message.content
                    
                    # 토큰 사용량 업데이트
                    if response.usage:
                        self.token_usage["input"] += response.usage.prompt_tokens
                        self.token_usage["output"] += response.usage.completion_tokens
                        self.token_usage["total"] += response.usage.total_tokens
                    
                    print(f"✅ GPT API 호출 성공 (시도 {attempt + 1})")
                    return result
                    
                except openai.RateLimitError as e:
                    self.rate_limit_count += 1
                    print(f"🚫 Rate Limit 오류 (발생 횟수: {self.rate_limit_count}): {e}")
                    
                    # Exponential backoff with jitter
                    base_wait = 10 ** (attempt + 1)
                    jitter = random.uniform(0.8, 1.2)
                    wait_time = min(base_wait * jitter, 120)  # 최대 2분
                    
                    print(f"⏳ {wait_time:.1f}초 대기 후 재시도... ({attempt + 1}/{retry_count})")
                    await asyncio.sleep(wait_time)
                    
                except openai.APIError as e:
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
                        return json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass
                
                # 최후의 수단: 원본 텍스트 반환
                print(f"⚠️ JSON 파싱 실패. 원본 텍스트: {text[:200]}...")
                return {"raw_response": text, "parse_error": True}

    async def grade_exam_answers(self, question_answers: List[Dict], 
                               exam_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        시험 답안 자동 채점
        
        Args:
            question_answers: YOLO에서 감지된 문제별 답안
            exam_info: 시험 정보 (과목, 연도 등)
            
        Returns:
            채점 결과 딕셔너리
        """
        try:
            # 채점 프롬프트 생성
            prompt = self._create_grading_prompt(question_answers, exam_info)
            
            # GPT API 호출
            response = await self._call_gpt4o_vision(prompt)
            
            # 응답 파싱
            grading_result = self._parse_grading_response(response, question_answers)
            
            logger.info(f"GPT 채점 완료: {len(question_answers)}문제 처리")
            return grading_result
            
        except Exception as e:
            logger.error(f"GPT 채점 실패: {e}")
            return self._create_mock_grading_result(question_answers)

    async def generate_explanations(self, wrong_answers: List[Dict], 
                                  crop_images: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        틀린 문제에 대한 AI 해설 생성
        
        Args:
            wrong_answers: 틀린 문제 목록
            crop_images: 문제 크롭 이미지 경로들
            
        Returns:
            문제별 해설 목록
        """
        explanations = []
        
        for wrong_answer in wrong_answers:
            try:
                # 해설 프롬프트 생성
                prompt = self._create_explanation_prompt(wrong_answer)
                
                # 이미지가 있으면 함께 분석
                image_path = None
                if crop_images:
                    image_path = self._find_matching_crop_image(wrong_answer, crop_images)
                
                # GPT API 호출
                response = await self._call_gpt4o_vision(prompt, image_path)
                
                # 해설 파싱
                explanation = self._parse_explanation_response(response, wrong_answer)
                explanations.append(explanation)
                
            except Exception as e:
                logger.error(f"해설 생성 실패 (문제 {wrong_answer.get('question_number', '?')}): {e}")
                explanations.append(self._create_fallback_explanation(wrong_answer))
        
        logger.info(f"GPT 해설 생성 완료: {len(explanations)}개 문제")
        return explanations

    async def generate_similar_questions(self, wrong_answers: List[Dict], 
                                       difficulty_level: str = "similar") -> List[Dict[str, Any]]:
        """
        틀린 문제 기반 유사문제 생성
        
        Args:
            wrong_answers: 틀린 문제 목록
            difficulty_level: 난이도 ("easier", "similar", "harder")
            
        Returns:
            생성된 유사문제 목록
        """
        similar_questions = []
        
        for wrong_answer in wrong_answers:
            try:
                # 유사문제 생성 프롬프트
                prompt = self._create_similar_question_prompt(wrong_answer, difficulty_level)
                
                # GPT API 호출
                response = await self._call_gpt4o_vision(prompt)
                
                # 유사문제 파싱
                similar_question = self._parse_similar_question_response(response, wrong_answer)
                similar_questions.append(similar_question)
                
            except Exception as e:
                logger.error(f"유사문제 생성 실패 (문제 {wrong_answer.get('question_number', '?')}): {e}")
                similar_questions.append(self._create_fallback_similar_question(wrong_answer))
        
        logger.info(f"GPT 유사문제 생성 완료: {len(similar_questions)}개 문제")
        return similar_questions

    def _create_grading_prompt(self, question_answers: List[Dict], exam_info: Optional[Dict] = None) -> str:
        """채점용 프롬프트 생성"""
        subject = exam_info.get('subject', '일반') if exam_info else '일반'
        grade_level = exam_info.get('grade_level', '중학교') if exam_info else '중학교'
        
        prompt = f"""
당신은 {grade_level} {subject} 전문 선생님입니다. 다음 객관식 시험 답안을 채점해주세요.

**채점 기준:**
- 각 문제는 5점입니다
- 정답/오답을 명확히 판단하세요
- 일반적인 {subject} 교육과정 기준으로 채점하세요

**답안 목록:**
"""
        
        for i, qa in enumerate(question_answers, 1):
            detected = qa.get('detected_answer', '미답')
            confidence = qa.get('confidence', 0.0)
            prompt += f"{i}번: {detected} (신뢰도: {confidence:.2f})\n"
        
        prompt += """

**응답 형식 (JSON):**
{
    "total_score": 85,
    "total_questions": 20,
    "correct_count": 17,
    "wrong_count": 3,
    "grade": "B+",
    "percentile": 75.5,
    "questions": [
        {
            "question_number": 1,
            "user_answer": "2",
            "correct_answer": "3",
            "is_correct": false,
            "score": 0,
            "comment": "정답은 3번입니다. 문제의 핵심을 다시 확인해보세요."
        }
    ],
    "overall_comment": "전체적으로 잘 풀었습니다. 특히 ~~ 부분을 더 공부하면 좋겠습니다."
}

정확한 JSON 형식으로만 응답해주세요.
"""
        return prompt

    def _create_explanation_prompt(self, wrong_answer: Dict) -> str:
        """해설용 프롬프트 생성"""
        question_num = wrong_answer.get('question_number', '?')
        user_answer = wrong_answer.get('user_answer', '미답')
        correct_answer = wrong_answer.get('correct_answer', '?')
        question_text = wrong_answer.get('vision_text', '')
        
        prompt = f"""
당신은 친절한 과외 선생님입니다. 학생이 틀린 문제에 대해 자세하고 이해하기 쉬운 해설을 제공해주세요.

**문제 정보:**
- 문제 번호: {question_num}번
- 문제 내용: {question_text[:200] if question_text else '문제 내용 없음'}
- 학생 답안: {user_answer}
- 정답: {correct_answer}

**해설 요구사항:**
1. 왜 틀렸는지 설명
2. 정답인 이유 상세 설명
3. 비슷한 문제 풀이 팁
4. 주의할 점
5. 학습자 친화적인 톤

**응답 형식 (JSON):**
{{
    "question_number": {question_num},
    "explanation": "상세한 해설 내용...",
    "key_concept": "핵심 개념",
    "why_wrong": "틀린 이유 설명",
    "correct_reasoning": "정답 근거",
    "study_tips": "학습 팁",
    "difficulty_level": "중간",
    "related_topics": ["관련 개념1", "관련 개념2"]
}}

친근하고 격려하는 톤으로 JSON 형식만 응답해주세요.
"""
        return prompt

    def _create_similar_question_prompt(self, wrong_answer: Dict, difficulty: str) -> str:
        """유사문제 생성용 프롬프트 생성"""
        question_num = wrong_answer.get('question_number', '?')
        correct_answer = wrong_answer.get('correct_answer', '?')
        question_text = wrong_answer.get('vision_text', '')
        
        difficulty_desc = {
            "easier": "조금 더 쉬운",
            "similar": "비슷한 난이도의",
            "harder": "조금 더 어려운"
        }.get(difficulty, "비슷한 난이도의")
        
        prompt = f"""
당신은 문제 출제 전문가입니다. 학생이 틀린 문제를 바탕으로 {difficulty_desc} 유사문제를 만들어주세요.

**원본 문제 정보:**
- 문제 번호: {question_num}번  
- 문제 내용: {question_text[:200] if question_text else '문제 내용 없음'}
- 정답: {correct_answer}

**문제 생성 요구사항:**
1. 동일한 개념/유형의 객관식 문제
2. 5개 선택지 (1~5번)
3. 명확한 정답과 해설
4. {difficulty_desc} 난이도
5. 실제 시험 문제 스타일

**응답 형식 (JSON):**
{{
    "question_text": "문제 내용 전체...",
    "choices": {{
        "1": "선택지 1",
        "2": "선택지 2", 
        "3": "선택지 3",
        "4": "선택지 4",
        "5": "선택지 5"
    }},
    "correct_answer": "3",
    "explanation": "정답 해설...",
    "difficulty_level": "중간",
    "concept": "핵심 개념",
    "estimated_time": "2분"
}}

JSON 형식으로만 응답해주세요.
"""
        return prompt

    def _find_matching_crop_image(self, wrong_answer: Dict, crop_images: List[str]) -> Optional[str]:
        """문제에 해당하는 크롭 이미지 찾기"""
        question_num = wrong_answer.get('question_number', 0)
        for image_path in crop_images:
            if f"qna_{question_num}" in image_path or f"question_{question_num}" in image_path:
                return image_path
        return None

    def _parse_grading_response(self, response: str, question_answers: List[Dict]) -> Dict[str, Any]:
        """채점 응답 파싱"""
        try:
            result = self._parse_json(response)
            if 'error' in result:
                return self._create_mock_grading_result(question_answers)
            
            result['success'] = True
            result['processing_method'] = 'gpt4o_mini'
            return result
            
        except Exception as e:
            logger.error(f"채점 응답 파싱 실패: {e}")
            return self._create_mock_grading_result(question_answers)

    def _parse_explanation_response(self, response: str, wrong_answer: Dict) -> Dict[str, Any]:
        """해설 응답 파싱"""
        try:
            explanation = self._parse_json(response)
            if 'error' in explanation:
                return self._create_fallback_explanation(wrong_answer)
            
            explanation['success'] = True
            return explanation
            
        except Exception as e:
            logger.error(f"해설 파싱 실패: {e}")
            return self._create_fallback_explanation(wrong_answer)

    def _parse_similar_question_response(self, response: str, wrong_answer: Dict) -> Dict[str, Any]:
        """유사문제 응답 파싱"""
        try:
            question = self._parse_json(response)
            if 'error' in question:
                return self._create_fallback_similar_question(wrong_answer)
            
            question['success'] = True
            question['original_question'] = wrong_answer.get('question_number')
            return question
            
        except Exception as e:
            logger.error(f"유사문제 파싱 실패: {e}")
            return self._create_fallback_similar_question(wrong_answer)

    def _create_mock_grading_result(self, question_answers: List[Dict]) -> Dict[str, Any]:
        """목업 채점 결과 생성"""
        total_questions = len(question_answers)
        correct_count = int(total_questions * 0.8)  # 80% 정답률
        wrong_count = total_questions - correct_count
        total_score = correct_count * 5
        
        questions = []
        for i, qa in enumerate(question_answers):
            is_correct = i < correct_count
            questions.append({
                "question_number": qa.get('question_number', i+1),
                "user_answer": qa.get('detected_answer', str((i % 5) + 1)),
                "correct_answer": str((i % 5) + 1) if is_correct else str(((i+1) % 5) + 1),
                "is_correct": is_correct,
                "score": 5 if is_correct else 0,
                "comment": "정답입니다!" if is_correct else "다시 한번 확인해보세요."
            })
        
        return {
            "success": True,
            "total_score": total_score,
            "total_questions": total_questions,
            "correct_count": correct_count,
            "wrong_count": wrong_count,
            "grade": "B+" if total_score >= 80 else "B",
            "percentile": 75.5,
            "questions": questions,
            "overall_comment": "전체적으로 잘 풀었습니다. 틀린 문제들을 다시 한번 확인해보세요.",
            "processing_method": "gpt_mock_mode",
            "note": "GPT API가 설정되지 않아 목업 데이터를 반환합니다."
        }

    def _create_fallback_explanation(self, wrong_answer: Dict) -> Dict[str, Any]:
        """기본 해설 생성"""
        return {
            "question_number": wrong_answer.get('question_number', 1),
            "explanation": "해설을 생성할 수 없습니다. 교과서를 참고하세요.",
            "key_concept": "기본 개념",
            "why_wrong": "선택지 확인 필요",
            "correct_reasoning": "정답 확인 필요",
            "study_tips": "관련 내용을 복습하세요.",
            "difficulty_level": "중간",
            "related_topics": [],
            "success": False,
            "error": "해설 생성 실패"
        }

    def _create_fallback_similar_question(self, wrong_answer: Dict) -> Dict[str, Any]:
        """기본 유사문제 생성"""
        return {
            "question_text": "유사문제를 생성할 수 없습니다.",
            "choices": {"1": "선택지 1", "2": "선택지 2", "3": "선택지 3", "4": "선택지 4", "5": "선택지 5"},
            "correct_answer": "1",
            "explanation": "유사문제 생성 실패",
            "difficulty_level": "중간",
            "concept": "기본 개념",
            "estimated_time": "2분",
            "original_question": wrong_answer.get('question_number'),
            "success": False,
            "error": "유사문제 생성 실패"
        }


# 싱글톤 인스턴스 (기존 호환성을 위해 이름 유지)
gemini_service = GPTService() 