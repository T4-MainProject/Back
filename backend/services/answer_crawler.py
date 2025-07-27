import requests
from bs4 import BeautifulSoup
import re
import json
import time
import os
import fitz  # PyMuPDF
from datetime import datetime
from urllib.parse import urljoin

class AnswerKeyCrawler:
    """시험 정답 크롤링 클래스 - 호랭이닷컴 전용"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.processed_urls = set()
        self.download_dir = "downloads"
        os.makedirs(self.download_dir, exist_ok=True)
    
    def download_pdf(self, pdf_url, filename):
        """PDF 파일 다운로드"""
        try:
            print(f"   📥 PDF 다운로드 시작: {pdf_url}")
            response = requests.get(pdf_url, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            file_path = os.path.join(self.download_dir, filename)
            with open(file_path, 'wb') as f:
                f.write(response.content)
            
            print(f"   ✅ PDF 다운로드 완료: {file_path}")
            return file_path
        except Exception as e:
            print(f"   ❌ PDF 다운로드 실패: {e}")
            return None
    
    def extract_answers_from_pdf(self, pdf_path):
        """PDF에서 정답 추출"""
        try:
            print(f"   📄 PDF 정답 추출: {pdf_path}")
            doc = fitz.open(pdf_path)
            all_text = ""
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                text = page.get_text()
                all_text += text + "\n"
            
            doc.close()
            
            # 정답 패턴 찾기
            answer_sequence = self.extract_answer_numbers(all_text)
            
            if answer_sequence:
                print(f"   ✅ PDF에서 {len(answer_sequence)}개 정답 추출 성공")
                return answer_sequence
            else:
                print(f"   ❌ PDF에서 정답 패턴을 찾을 수 없음")
                return []
                
        except Exception as e:
            print(f"   ❌ PDF 처리 오류: {e}")
            return []
    
    def find_download_links(self, soup, base_url, search_info):
        """다운로드 링크 찾기 - 학년별 검색 지원"""
        download_links = []
        year = search_info['year']
        month = search_info['month']
        subject = search_info['subject']
        grade = search_info.get('grade', '')
        
        # 다운로드 버튼/링크 찾기
        download_elements = soup.find_all(['a', 'button'], string=re.compile(r'다운로드|download', re.I))
        
        for element in download_elements:
            # 주변 텍스트에서 년도, 월, 과목, 학년 확인
            parent_text = ""
            parent = element.parent
            for _ in range(3):  # 3단계 위까지 확인
                if parent:
                    parent_text += parent.get_text() + " "
                    parent = parent.parent
                else:
                    break
            
            # 기본 매칭 조건
            year_match = year in parent_text
            month_match = month in parent_text
            subject_match = subject in parent_text
            
            # 학년별 매칭 (있으면 추가 점수)
            grade_match = grade in parent_text if grade else True
            
            if year_match and month_match and subject_match and grade_match:
                href = element.get('href')
                if href:
                    full_url = urljoin(base_url, href)
                    download_links.append(full_url)
                    print(f"   ✅ 다운로드 링크 발견 ({grade}): {full_url}")
        
        # onclick 이벤트에서 PDF 링크 찾기
        onclick_elements = soup.find_all(attrs={"onclick": True})
        for element in onclick_elements:
            onclick = element.get('onclick', '')
            if 'pdf' in onclick.lower() or 'download' in onclick.lower():
                # JavaScript에서 URL 추출
                url_match = re.search(r"['\"]([^'\"]*\.pdf[^'\"]*)['\"]", onclick)
                if url_match:
                    pdf_url = urljoin(base_url, url_match.group(1))
                    download_links.append(pdf_url)
                    print(f"   ✅ onclick에서 PDF 링크 발견: {pdf_url}")
        
        return download_links
    
    def crawl_horaeng_by_grade(self, year, month, subject, grade):
        """학년별 호랭이닷컴 크롤링 - 개선된 검색 전략"""
        print(f"   🎓 {grade} 크롤링 시작...")
        
        # 호랭이닷컴 페이지 URLs
        base_urls = [
            f"https://horaeng.com/{page_id}" 
            for page_id in [439, 353, 352, 267, 260, 238]
        ]
        
        # 학년별 검색 키워드 설정
        grade_keywords = {
            '고3': ['고3', '수능', '모의평가', '대학수학능력시험'],
            '고2': ['고2', '2학년'],  
            '고1': ['고1', '1학년']
        }
        
        search_keywords = grade_keywords.get(grade, [grade])
        
        for url in base_urls:
            try:
                response = requests.get(url, headers=self.headers, timeout=10)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                page_text = soup.get_text()
                
                # 기본 조건: 연도 + 월 + 과목
                basic_match = (year in page_text and month in page_text and subject in page_text)
                
                if basic_match:
                    print(f"   📋 기본 매칭 페이지 발견: {url}")
                    
                    # 학년별 우선순위 점수 계산
                    grade_score = 0
                    matched_keywords = []
                    
                    for keyword in search_keywords:
                        if keyword in page_text:
                            grade_score += 1
                            matched_keywords.append(keyword)
                    
                    # 고3의 경우: 모의평가/수능이면 더 높은 점수
                    if grade == '고3' and ('모의평가' in page_text or '수능' in page_text):
                        grade_score += 10  # 높은 가중치
                        print(f"   🎯 {grade} 우선 매칭: {matched_keywords}")
                    elif grade != '고3' and grade.replace('고', '') in page_text:
                        grade_score += 10  # 학년 명시적 매칭
                        print(f"   🎯 {grade} 명시적 매칭: {matched_keywords}")
                    else:
                        print(f"   📝 기본 매칭 (점수: {grade_score}): {matched_keywords}")
                    
                    # 점수가 있으면 다운로드 시도 (고3은 낮은 점수도 허용)
                    if grade_score > 0 or (grade == '고3' and basic_match):
                        search_info = {
                            'year': year,
                            'month': month,
                            'subject': subject,
                            'grade': grade
                        }
                        
                        # 다운로드 링크 찾기 (더 유연한 매칭)
                        download_links = self.find_download_links_flexible(soup, url, search_info)
                        
                        # PDF에서 정답 추출
                        for link in download_links:
                            if link not in self.processed_urls:
                                filename = f"{year}_{month}_{subject}_{grade}_{len(self.processed_urls)}.pdf"
                                pdf_path = self.download_pdf(link, filename)
                                self.processed_urls.add(link)
                                
                                if pdf_path:
                                    answers = self.extract_answers_from_pdf(pdf_path)
                                    if answers and len(answers) >= 10:  # 최소 10개 이상
                                        print(f"   🎉 {grade} 정답 발견: {len(answers)}개 (점수: {grade_score})")
                                        return {
                                            'answers': answers,
                                            'found_grade': grade,
                                            'source_url': url,
                                            'pdf_path': pdf_path,
                                            'match_score': grade_score
                                        }
                        
            except Exception as e:
                print(f"   ❌ {grade} 크롤링 실패 ({url}): {e}")
                continue
        
        print(f"   ❌ {grade} 정답 없음")
        return None
    
    def find_download_links_flexible(self, soup, base_url, search_info):
        """엄격한 다운로드 링크 찾기 - 학년별 필터링 강화"""
        download_links = []
        year = search_info['year']
        month = search_info['month']
        subject = search_info['subject']
        grade = search_info.get('grade', '')
        
        # 모든 링크 요소 찾기
        all_links = soup.find_all('a', href=True)
        
        for link in all_links:
            href = link.get('href', '')
            link_text = link.get_text(strip=True)
            
            # PDF 링크 또는 다운로드 관련 링크
            if ('.pdf' in href.lower() or 'download' in href.lower() or 
                'storage' in href.lower() or '다운로드' in link_text):
                
                # 주변 텍스트 수집
                parent_text = ""
                parent = link.parent
                for _ in range(4):  # 컨텍스트 수집 범위 확장 (2 -> 4)
                    if parent:
                        parent_text += parent.get_text() + " "
                        parent = parent.parent
                    else:
                        break
                
                combined_text = link_text + " " + parent_text + " " + href
                
                # 기본 매칭 조건 (연도, 월, 과목)
                year_match = year in combined_text
                month_match = month in combined_text  
                subject_match = subject in combined_text
                
                # 🎯 학년별 엄격한 필터링 추가
                grade_conflict = False
                has_other_grade = False
                
                if grade == '고3':
                    # 고3 검색시: 다른 학년(고2, 고1)이 명시된 파일만 제외
                    # 학년 표기가 없는 "모의평가" 파일은 허용
                    if '고2' in combined_text or '고1' in combined_text:
                        has_other_grade = True
                        grade_conflict = True
                        print(f"   ❌ 고3 검색 중 다른 학년 파일 제외: {href}")
                elif grade == '고2':
                    # 고2 검색시: 다른 학년이 명시된 파일만 제외
                    if '고3' in combined_text or '고1' in combined_text:
                        has_other_grade = True
                        grade_conflict = True
                        print(f"   ❌ 고2 검색 중 다른 학년 파일 제외: {href}")
                elif grade == '고1':
                    # 고1 검색시: 다른 학년이 명시된 파일만 제외
                    if '고3' in combined_text or '고2' in combined_text:
                        has_other_grade = True
                        grade_conflict = True
                        print(f"   ❌ 고1 검색 중 다른 학년 파일 제외: {href}")
                
                # 학년 충돌이 없고 기본 조건을 만족하는 경우
                if year_match and month_match and subject_match and not grade_conflict:
                    full_url = urljoin(base_url, href)
                    download_links.append(full_url)
                    
                    if has_other_grade:
                        print(f"   ✅ {grade} 전용 매칭 링크: {full_url}")
                    else:
                        print(f"   ✅ {grade} 학년무표기 매칭 링크: {full_url}")  # 학년 표기 없는 파일
        
        return download_links
    
    def auto_find_answer_key_with_grade_priority(self, year, month, subject, grade_priority):
        """🚀 학년 우선순위 기반 정답 크롤링"""
        print(f"🔍 학년별 우선순위 크롤링: {' → '.join(grade_priority)}")
        
        for grade in grade_priority:
            print(f"\n📚 {grade} 검색 중...")
            result = self.crawl_horaeng_by_grade(year, month, subject, grade)
            
            if result and result['answers']:
                print(f"✅ {grade}에서 정답 발견!")
                return {
                    'success': True,
                    'answers': result['answers'],
                    'total_questions': len(result['answers']),
                    'found_grade': result['found_grade'],
                    'source': f'호랭이닷컴 ({result["found_grade"]})',
                    'source_url': result.get('source_url'),
                    'pdf_path': result.get('pdf_path')
                }
        
        print("❌ 모든 학년에서 정답을 찾을 수 없음")
        return {
            'success': False,
            'answers': [],
            'total_questions': 0,
            'error': f'모든 학년 검색 실패: {", ".join(grade_priority)}'
        }
    
    def extract_answer_numbers(self, content):
        """정답 번호(1,2,3,4,5) 추출 - 개선된 패턴"""
        choice_map = {'①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5'}
        
        # 정답 패턴 (문제별 정답 형식)
        patterns = [
            r'(\d{1,2})\s*[.\-:]\s*([①②③④⑤])',  # 1.①, 1-②, 1:③
            r'(\d{1,2})번?\s*([①②③④⑤])',  # 1번①, 1①
            r'문제\s*(\d{1,2})\s*([①②③④⑤])',  # 문제1①
            r'(\d{1,2})\s*\)\s*([①②③④⑤])',  # 1)①
        ]
        
        answers = {}
        
        for pattern in patterns:
            matches = re.findall(pattern, content)
            for question_num, choice in matches:
                q_num = int(question_num)
                if 1 <= q_num <= 50:  # 유효한 문제번호
                    answers[q_num] = choice_map[choice]
        
        if answers:
            sorted_questions = sorted(answers.keys())
            answer_sequence = [answers[q] for q in sorted_questions]
            print(f"   📝 정답 패턴 매칭: {len(answer_sequence)}개")
            print(f"   📋 문제번호 범위: {min(sorted_questions)}~{max(sorted_questions)}")
            return answer_sequence
        
        # 실패시 에러 메시지
        print(f"   ❌ 정답 패턴을 찾을 수 없음")
        print(f"   📄 콘텐츠 샘플: {content[:300]}...")
        return []
    
    def get_answers(self, year, month, subject):
        """메인 크롤링 메서드 - 기본 우선순위 사용"""
        grade_priority = ['고3', '고2', '고1']  # 기본 우선순위
        result = self.auto_find_answer_key_with_grade_priority(year, month, subject, grade_priority)
        return result.get('answers', []) if result else []
    
    def auto_find_answer_key(self, year='2024', month='9', subject='영어'):
        """자동으로 정답지 찾기 - 기본 메서드"""
        try:
            print(f"🔍 정답지 자동 검색: {year}년 {month}월 {subject}")
            grade_priority = ['고3', '고2', '고1']  # 기본 우선순위
            result = self.auto_find_answer_key_with_grade_priority(year, month, subject, grade_priority)
            
            if result and result.get('success'):
                print(f"✅ 정답지 크롤링 성공: {len(result['answers'])}개 문제")
                return result
            else:
                print("❌ 정답을 찾을 수 없습니다")
                return {
                    'success': False,
                    'answers': [],
                    'total_questions': 0,
                    'error': result.get('error', '정답지를 찾을 수 없습니다') if result else '크롤링 결과가 없습니다'
                }
                
        except Exception as e:
            print(f"❌ 정답지 크롤링 중 오류 발생: {e}")
            return {
                'success': False,
                'answers': [],
                'total_questions': 0,
                'error': str(e)
            }
    
    def find_answer_key_auto(self):
        """인자 없이 호출 가능한 메서드"""
        return self.auto_find_answer_key('2025', '7', '영어')
    
    def find_answer_key(self, exam_info=None):
        """시험 정보 딕셔너리로 호출"""
        if exam_info:
            year = exam_info.get('year', '2025')
            month = exam_info.get('month', '7') 
            subject = exam_info.get('subject', '영어')
        else:
            year, month, subject = '2025', '7', '영어'
            
        return self.auto_find_answer_key(year, month, subject)
    
    def format_answers(self, answers):
        """정답을 보기 좋게 포맷팅"""
        if not answers:
            return "정답 없음"
        
        formatted = []
        for i in range(0, len(answers), 5):
            chunk = answers[i:i+5]
            formatted.append(f"{i+1:2d}~{min(i+5, len(answers)):2d}번: {' '.join(chunk)}")
        
        return '\n'.join(formatted)

# 테스트 실행 함수
def main():
    """테스트 실행"""
    crawler = AnswerKeyCrawler()
    
    # 학년별 우선순위 테스트
    print("🧪 학년별 우선순위 크롤링 테스트")
    grade_priority = ['고2', '고3', '고1']
    result = crawler.auto_find_answer_key_with_grade_priority('2024', '9', '영어', grade_priority)
    
    if result and result.get('success'):
        answers = result['answers']
        found_grade = result.get('found_grade', '알 수 없음')
        print(f"\n📝 전체 정답 ({len(answers)}개) - {found_grade}:")
        print(crawler.format_answers(answers))
    else:
        print(f"❌ 테스트 실패: {result}")

if __name__ == "__main__":
    main()