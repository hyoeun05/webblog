// DOM이 모두 로드된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', () => {

    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');
    const loadingSpinner = document.getElementById('loading-spinner');

    // 폼 제출(검색 버튼 클릭 또는 Enter) 이벤트 리스너
    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 폼의 기본 동작(페이지 새로고침) 방지

        const query = searchInput.value.trim(); // 입력된 검색어

        if (query === "") {
            // alert 대신 HTML 메시지 사용
            resultsContainer.innerHTML = '<p style="color: red; text-align: center;">검색어를 입력하세요.</p>';
            return;
        }

        // 결과 영역 초기화 및 로딩 스피너 표시
        resultsContainer.innerHTML = '';
        loadingSpinner.style.display = 'block'; // 스피너 보이기

        try {
            // app.py의 @app.route('/search', methods=['POST'])로 요청
            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query }), // 검색어를 JSON 형태로 전송
            });

            // 로딩 스피너 숨기기
            loadingSpinner.style.display = 'none';

            if (!response.ok) {
                // 서버에서 4xx, 5xx 오류 반환 시
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP 오류! 상태: ${response.status}`);
            }

            // 성공적으로 데이터를 받으면 JSON으로 파싱
            const data = await response.json();
            
            // 검색 결과 표시 함수 호출
            displayResults(data.items);

        } catch (error) {
            // fetch 실패 또는 response.ok가 아닐 때
            console.error('검색 중 오류 발생:', error);
            loadingSpinner.style.display = 'none';
            resultsContainer.innerHTML = `<p style="color: red; text-align: center;">검색 중 오류가 발생했습니다: ${error.message}</p>`;
        }
    });

    /**
     * 검색 결과를 받아 HTML 리스트로 만들어주는 함수
     * @param {Array} items - 네이버 API로부터 받은 블로그 아이템 배열
     */
    function displayResults(items) {
        if (!items || items.length === 0) {
            resultsContainer.innerHTML = '<p style="text-align: center;">검색 결과가 없습니다.</p>';
            return;
        }

        // 결과가 있으니 컨테이너 초기화
        resultsContainer.innerHTML = '';

        // 각 아이템을 순회하며 HTML 요소 생성
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('result-item');
            
            // 날짜 포맷팅 (YYYYMMDD -> YYYY.MM.DD)
            const postDate = item.postdate.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');

            // 네이버 API는 <b> 태그를 포함하므로 innerHTML 사용
            itemElement.innerHTML = `
                <h3>
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer">
                        ${item.title}
                    </a>
                </h3>
                <p>${item.description}</p>
                <div class="meta">
                    <span>블로거: <strong>${item.bloggername}</strong></span> |
                    <span>작성일: ${postDate}</span>
                </div>
            `;
            
            resultsContainer.appendChild(itemElement);
        });
    }
});