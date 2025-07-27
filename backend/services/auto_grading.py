import os
import time
import glob
from typing import List, Dict, Any
from .vision_service import VisionService
from .answer_crawler import AnswerKeyCrawler

class AutoGradingSystem:
    def __init__(self):
        self.vision_service = VisionService()
        self.answer_crawler = AnswerKeyCrawler()

    def grade_exam(self, student_answers: List[str], answer_key: List[str]) -> Dict[str, Any]:
        if not student_answers or not answer_key:
            return {"error": "답안 또는 정답이 없습니다"}
        
        results = {
            "total_questions": len(answer_key),
            "answered_questions": len([a for a in student_answers if a]),
            "score": 0,
            "wrong_questions": [],
            "percentage": 0.0,
            "answer_distribution": {}
        }
        
        max_len = max(len(student_answers), len(answer_key))
        student_padded = student_answers + [None] * (max_len - len(student_answers))
        answer_padded = answer_key + [None] * (max_len - len(answer_key))
        
        for i, (student, correct) in enumerate(zip(student_padded, answer_padded)):
            if correct is None:
                continue
            if student == correct:
                results["score"] += 1
            else:
                results["wrong_questions"].append({
                    "question": i + 1,
                    "student_answer": student,
                    "correct_answer": correct
                })
            if student:
                results["answer_distribution"][student] = results["answer_distribution"].get(student, 0) + 1
        
        results["percentage"] = round(results["score"] / results["total_questions"] * 100, 1)
        return results

    async def process_single_exam(self, image_path: str, qna_crop_paths: List[str] = None, yolo_results: Dict = None) -> Dict[str, Any]:
        print(f"📄 시험지 분석 시작: {os.path.basename(image_path)}")
        exam_result = await self.vision_service.analyze_exam_paper(image_path, qna_crop_paths, yolo_results)
        student_answers = []
        for question in exam_result.get('questions', []):
            answer = question.get('detected_answer')
            student_answers.append(answer)
        exam_result['student_answers'] = student_answers
        return exam_result

    async def auto_grade_exam(self, image_path: str, qna_crop_paths: List[str] = None, yolo_results: Dict = None) -> Dict[str, Any]:
        try:
            exam_result = await self.process_single_exam(image_path, qna_crop_paths, yolo_results)
            exam_metadata = exam_result.get('header', {})
            student_answers = exam_result.get('student_answers', [])
            print(f"📊 학생 답안: {student_answers}")
            
            # 🚀 정답지 크롤링 - 헤더 정보 기반 + 학년 우선순위
            try:
                print("🔍 정답지 크롤링 시작...")
                
                # 헤더에서 실제 시험 정보 추출
                year = exam_metadata.get('year', '2024')
                month = exam_metadata.get('month', '9')
                subject = exam_metadata.get('subject', '영어')
                
                # 학년 정보 추출 - 명시적 표기만 감지
                grade = None
                exam_type = None
                header_text = str(exam_metadata)
                
                # 학년 감지 - 명시적 표기만 (교시는 제외)
                if '고3' in header_text or '고등학교 3학년' in header_text:
                    grade = '고3'
                elif '고2' in header_text or '고등학교 2학년' in header_text:
                    grade = '고2'
                elif '고1' in header_text or '고등학교 1학년' in header_text:
                    grade = '고1'
                
                # 시험 유형 감지
                if '모의평가' in header_text:
                    exam_type = '모의평가'
                elif '전국연합학력평가' in header_text or '모의고사' in header_text:
                    exam_type = '모의고사'
                elif '대학수학능력시험' in header_text:
                    exam_type = '수능'
                else:
                    exam_type = '모의고사'  # 기본값
                
                print(f"📋 감지된 시험 정보: {year}년 {month}월 {subject}")
                if grade:
                    print(f"🎓 감지된 학년: {grade}")
                if exam_type:
                    print(f"📝 시험 유형: {exam_type}")
                if not grade:
                    print(f"🎓 학년 정보 없음 → 고3부터 검색")
                
                # 학년별 우선순위 설정
                if grade:
                    # 헤더에 학년이 명시된 경우: 해당 학년 우선
                    if grade == '고3':
                        grade_priority = ['고3', '고2', '고1']
                    elif grade == '고2':
                        grade_priority = ['고2', '고3', '고1']
                    elif grade == '고1':
                        grade_priority = ['고1', '고2', '고3']
                else:
                    # 학년 정보가 없는 경우: 기본 순서
                    grade_priority = ['고3', '고2', '고1']
                
                print(f"🔍 검색 우선순위: {' → '.join(grade_priority)}")
                
                # 크롤러에 우선순위 전달
                result = self.answer_crawler.auto_find_answer_key_with_grade_priority(
                    year, month, subject, grade_priority
                )
                
                if result and result.get('success'):
                    answer_key = result['answers']
                    found_grade = result.get('found_grade', '알 수 없음')
                    print(f"✅ 정답지 크롤링 성공: {len(answer_key)}개 문제 ({found_grade})")
                    print(f"📝 정답 미리보기: {' '.join(answer_key[:10])}{'...' if len(answer_key) > 10 else ''}")
                else:
                    error_msg = result.get('error', '정답지를 찾을 수 없습니다') if result else '크롤링 결과가 없습니다'
                    raise Exception(error_msg)
                    
            except Exception as e:
                print(f"❌ 정답지 크롤링 실패: {e}")
                # 백업: 수동 정답 입력 요청
                return {
                    **exam_result,
                    "grade": {"error": f"정답지를 찾을 수 없습니다: {e}"},
                    "auto_graded": False,
                    "manual_input_required": True,
                    "student_answers": student_answers,
                    "message": "정답지 크롤링에 실패했습니다. 수동으로 정답을 입력해주세요."
                }
            
            # 🎯 채점 수행
            print("🎯 채점 시작...")
            grade_result = self.grade_exam(student_answers, answer_key)
            
            # 📊 최종 결과
            result = {
                **exam_result,
                "answer_key": answer_key,
                "grade": grade_result,
                "auto_graded": True,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "crawling_success": True
            }
            
            print(f"🎉 채점 완료: {grade_result['score']}/{grade_result['total_questions']} ({grade_result['percentage']}%)")
            
            # 틀린 문제 요약
            if grade_result['wrong_questions']:
                wrong_count = len(grade_result['wrong_questions'])
                print(f"❌ 틀린 문제: {wrong_count}개")
                for wrong in grade_result['wrong_questions'][:3]:  # 처음 3개만 미리보기
                    print(f"   {wrong['question']}번: {wrong['student_answer']} → {wrong['correct_answer']}")
                if wrong_count > 3:
                    print(f"   ... 외 {wrong_count-3}개")
            else:
                print("🎉 모든 문제 정답!")
            
            return result
            
        except Exception as e:
            print(f"❌ 자동 채점 오류: {e}")
            return {
                "error": str(e),
                "auto_graded": False,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }

    async def process_exam_batch(self, image_folder: str) -> List[Dict[str, Any]]:
        image_files = glob.glob(f"{image_folder}/*.jpg") + glob.glob(f"{image_folder}/*.png")
        if not image_files:
            print("❌ 이미지 파일을 찾을 수 없습니다")
            return []
        
        print(f"📁 배치 처리 시작: {len(image_files)}개 파일")
        results = []
        
        for i, image_path in enumerate(image_files):
            print(f"\n🔄 진행률: {i+1}/{len(image_files)}")
            try:
                result = await self.auto_grade_exam(image_path)
                results.append(result)
            except Exception as e:
                print(f"❌ {os.path.basename(image_path)} 처리 실패: {e}")
                results.append({
                    "filename": os.path.basename(image_path),
                    "error": str(e),
                    "auto_graded": False
                })
        
        print(f"\n✅ 배치 처리 완료: {len(results)}개 결과")
        return results

    def generate_batch_report(self, results: List[Dict]) -> Dict[str, Any]:
        successful = [r for r in results if r.get('auto_graded')]
        failed = [r for r in results if not r.get('auto_graded')]
        
        if not successful:
            return {
                "summary": "모든 처리 실패",
                "total_processed": len(results),
                "successful": 0,
                "failed": len(failed)
            }
        
        scores = [r['grade']['percentage'] for r in successful if 'grade' in r and 'percentage' in r['grade']]
        if scores:
            avg_score = sum(scores) / len(scores)
            max_score = max(scores)
            min_score = min(scores)
        else:
            avg_score = max_score = min_score = 0
        
        wrong_questions = {}
        for result in successful:
            if 'grade' in result:
                for wrong in result['grade'].get('wrong_questions', []):
                    q_num = wrong['question']
                    wrong_questions[q_num] = wrong_questions.get(q_num, 0) + 1
        
        answer_patterns = {}
        for result in successful:
            for answer in result.get('student_answers', []):
                if answer:
                    answer_patterns[answer] = answer_patterns.get(answer, 0) + 1
        
        report = {
            "summary": {
                "total_processed": len(results),
                "successful": len(successful),
                "failed": len(failed),
                "success_rate": round(len(successful) / len(results) * 100, 1) if results else 0
            },
            "score_statistics": {
                "average": round(avg_score, 1),
                "maximum": round(max_score, 1),
                "minimum": round(min_score, 1),
                "scores": scores
            },
            "difficult_questions": dict(sorted(wrong_questions.items(), key=lambda x: x[1], reverse=True)[:10]),
            "answer_distribution": answer_patterns,
            "failed_files": [r.get('filename', 'unknown') for r in failed],
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        return report

    def manual_grade_exam(self, student_answers: List[str], answer_key: List[str]) -> Dict[str, Any]:
        """수동 채점 메서드"""
        print("📝 수동 채점 시작...")
        grade_result = self.grade_exam(student_answers, answer_key)
        
        result = {
            "student_answers": student_answers,
            "answer_key": answer_key,
            "grade": grade_result,
            "auto_graded": False,
            "manual_graded": True,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        print(f"🎯 수동 채점 완료: {grade_result['score']}/{grade_result['total_questions']} ({grade_result['percentage']}%)")
        return result