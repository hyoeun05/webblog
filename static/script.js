// static/script.js

// DOM이 모두 로드된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', () => {

    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');

    // 폼 제출(검색) 이벤트 리스너
    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 폼의 기본 동작(페이지 새로고침) 방지

        const query = searchInput.value.trim(); // 입력된 검색어 (앞뒤 공백 제거)

        if (query === "") {
            alert("검색어를 입력하세요.");
            return;
        }

        // 결과 영역 초기화
        resultsContainer.innerHTML = '검색 중...';

        try {
            // 1. Flask 백엔드(/search)에 검색어(query)를 POST 방식으로 요청
            const response = await fetch('http://127.0.0.1:5000/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query }), // 검색어를 JSON 형태로 전송
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 2. 백엔드로부터 받은 JSON 데이터를 파싱
            const data = await response.json();
            
            // 3. 검색 결과(data.items)를 화면에 표시
            displayResults(data.items);

        } catch (error) {
            console.error('검색 중 오류 발생:', error);
            resultsContainer.innerHTML = '검색 중 오류가 발생했습니다.';
        }
    });

    // 검색 결과를 HTML 리스트로 만들어주는 함수
    function displayResults(items) {
        if (!items || items.length === 0) {
            resultsContainer.innerHTML = '검색 결과가 없습니다.';
            return;
        }

        // 결과 영역 비우기
        resultsContainer.innerHTML = '';

        // 각 아이템을 순회하며 HTML 요소 생성
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('result-item');

            // 네이버 API는 제목, 본문에 <b> 태그를 포함하여 반환합니다.
            // innerHTML을 사용해야 <b> 태그가 스타일링됩니다.
            
            // 날짜 포맷 변경 (YYYYMMDD -> YYYY.MM.DD)
            const postDate = item.postdate.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3');

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