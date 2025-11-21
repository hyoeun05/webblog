document.addEventListener('DOMContentLoaded', () => {
    const loadingSpinner = document.getElementById('loading-spinner');

    // ==========================================
    // 1. 맛집 블로그 검색
    // ==========================================
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        const searchInput = document.getElementById('search-input');
        const resultsContainer = document.getElementById('results-container');

        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const query = searchInput.value.trim();
            if (!query) return;

            resultsContainer.innerHTML = '';
            loadingSpinner.style.display = 'block';

            try {
                const response = await fetch('/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: query })
                });
                const data = await response.json();
                loadingSpinner.style.display = 'none';
                
                if (data.items) {
                    data.items.forEach(item => {
                        resultsContainer.innerHTML += `
                            <div class="result-item">
                                <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
                                <p>${item.description}</p>
                                <div class="meta">${item.bloggername} | ${item.postdate}</div>
                            </div>`;
                    });
                } else {
                    resultsContainer.innerHTML = '<p class="no-result">결과가 없습니다.</p>';
                }
            } catch (error) {
                loadingSpinner.style.display = 'none';
                resultsContainer.innerHTML = '<p class="error">오류 발생</p>';
            }
        });
    }

    // ==========================================
    // 3. 멜론 실시간 차트 보기 (Top 100)
    // ==========================================
    const melonChartContainer = document.getElementById('melon-chart-container');
    if (melonChartContainer) {
        loadMelonData(data => renderMelonList(data, melonChartContainer));
        document.getElementById('btn-refresh-melon').addEventListener('click', () => {
            loadMelonData(data => renderMelonList(data, melonChartContainer));
        });
    }

    // ==========================================
    // 4. 멜론 차트 가수 검색
    // ==========================================
    const melonSearchForm = document.getElementById('melon-search-form');
    if (melonSearchForm) {
        const input = document.getElementById('melon-search-input');
        const resultDiv = document.getElementById('melon-search-result');

        melonSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const keyword = input.value.trim();
            if (!keyword) return;

            loadMelonData(data => {
                // 가수 이름에 키워드가 포함된 곡만 필터링
                const filtered = data.filter(song => song.artist.includes(keyword));
                resultDiv.innerHTML = '';
                if (filtered.length > 0) {
                    renderMelonList(filtered, resultDiv);
                } else {
                    resultDiv.innerHTML = `<p class="no-result">'${keyword}' 가수의 곡이 Top 100에 없습니다.</p>`;
                }
            });
        });
    }

    // ==========================================
    // 5. 멜론 차트 점령 가수 랭킹
    // ==========================================
    const melonRankingContainer = document.getElementById('melon-ranking-container');
    if (melonRankingContainer) {
        loadMelonData(data => {
            // 가수별 곡 수 카운트
            const artistCounts = {};
            data.forEach(song => {
                artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
            });

            // 배열로 변환 및 정렬 (곡 수 내림차순)
            const sortedArtists = Object.entries(artistCounts)
                .sort((a, b) => b[1] - a[1]);

            melonRankingContainer.innerHTML = '<ol class="rank-list" style="padding-left:20px;"></ol>';
            const list = melonRankingContainer.querySelector('ol');

            sortedArtists.forEach(([artist, count], index) => {
                // 10위까지만 표시 (혹은 원하면 전체 표시 가능)
                if (index < 20) {
                    list.innerHTML += `
                        <li style="padding:15px 0; border-bottom:1px solid #f5f5f5; font-size:18px; display:flex; justify-content:space-between;">
                            <span>
                                <strong style="color:#03C75A; margin-right:10px;">${index + 1}위</strong>
                                ${artist}
                            </span>
                            <span style="font-weight:bold; color:#555;">${count}곡</span>
                        </li>`;
                }
            });
        });
    }

    // --- [공통 함수] 멜론 데이터 가져오기 ---
    async function loadMelonData(callback) {
        loadingSpinner.style.display = 'block';
        try {
            const response = await fetch('/melon');
            const data = await response.json();
            loadingSpinner.style.display = 'none';
            if (data.items) callback(data.items);
            else alert('데이터를 불러오지 못했습니다.');
        } catch (e) {
            loadingSpinner.style.display = 'none';
            alert('오류 발생');
        }
    }

    // --- [공통 함수] 멜론 리스트 그리기 ---
    function renderMelonList(items, container) {
        container.innerHTML = '';
        items.forEach(song => {
            container.innerHTML += `
                <div class="melon-item">
                    <div class="melon-rank">${song.rank}</div>
                    <img src="${song.image}" class="melon-img">
                    <div class="melon-info">
                        <div class="melon-title">${song.title}</div>
                        <div class="melon-artist">${song.artist}</div>
                    </div>
                </div>`;
        });
    }
});