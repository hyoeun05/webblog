from flask import Flask, render_template, request, jsonify, g, redirect
from flask_cors import CORS
import requests
import sqlite3
from bs4 import BeautifulSoup

app = Flask(__name__)
CORS(app) 

# --- 네이버 API 키 ---
NAVER_CLIENT_ID = "9Q6o2Qnqn3TztgCqMwEQ" 
NAVER_CLIENT_SECRET = "WR2bujcUqY"

# --- SQLite DB 설정 ---
DATABASE = 'search.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

DB_SCHEMA_SCRIPT = """
CREATE TABLE IF NOT EXISTS search_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

def setup_database():
    db = sqlite3.connect(DATABASE)
    db.cursor().executescript(DB_SCHEMA_SCRIPT)
    db.commit()
    db.close()

# -------------------------
# [페이지 라우팅]
# -------------------------

@app.route('/')
def root():
    return redirect('/mainpage')

@app.route('/mainpage')
def main_page():
    return render_template('main.html')

@app.route('/blog-search')
def blog_search_page():
    return render_template('blog_search.html')

@app.route('/rank')
def rank_page():
    try:
        db = get_db()
        cursor = db.execute('SELECT query, COUNT(query) as count FROM search_log GROUP BY query ORDER BY count DESC LIMIT 10')
        rankings = cursor.fetchall()
        return render_template('rank.html', rankings=rankings)
    except sqlite3.Error:
        return render_template('rank.html', rankings=[], error="DB 오류")

@app.route('/melon-chart')
def melon_chart_page():
    return render_template('melon_chart.html')

@app.route('/melon-search')
def melon_search_page():
    return render_template('melon_search.html')

@app.route('/melon-ranking')
def melon_ranking_page():
    return render_template('melon_ranking.html')


# -------------------------
# [API] 데이터 처리
# -------------------------

@app.route('/search', methods=['POST'])
def search_blog():
    data = request.get_json()
    query = data.get('query', '').strip()

    if not query:
        return jsonify({"error": "검색어가 없습니다."}), 400

    try:
        db = get_db()
        db.execute('INSERT INTO search_log (query) VALUES (?)', (query,))
        db.commit()
    except sqlite3.Error as e:
        print(f"DB 저장 오류: {e}")

    api_url = "https://openapi.naver.com/v1/search/blog.json"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }
    params = {
        "query": query + " 맛집", 
        "display": 10,
        "sort": "sim"
    }

    try:
        response = requests.get(api_url, headers=headers, params=params)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/melon', methods=['GET'])
def get_melon_chart():
    # 멜론 차트 1~100위 크롤링
    url = "https://www.melon.com/chart/index.htm"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')

        chart_data = []
        # tr.lst50 (1~50위)과 tr.lst100 (51~100위) 모두 선택
        songs = soup.select('tr.lst50, tr.lst100') 

        for i, song in enumerate(songs):
            title_el = song.select_one('.ellipsis.rank01 a')
            artist_el = song.select_one('.ellipsis.rank02 a')
            img_el = song.select_one('.image_typeAll img')

            if title_el and artist_el and img_el:
                chart_data.append({
                    "rank": i + 1,
                    "title": title_el.text,
                    "artist": artist_el.text,
                    "image": img_el['src']
                })
        
        return jsonify({"items": chart_data})

    except Exception as e:
        print(f"크롤링 오류: {e}")
        return jsonify({"error": "멜론 차트를 가져오는데 실패했습니다."}), 500

if __name__ == '__main__':
    setup_database()
    app.run(debug=True, host='0.0.0.0', port=5000)