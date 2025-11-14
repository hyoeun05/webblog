from flask import Flask, render_template, request, jsonify, g
from flask_cors import CORS
import requests
import sqlite3 #! DB 사용을 위해 import

app = Flask(__name__)
CORS(app) 

 
NAVER_CLIENT_ID = "" 
NAVER_CLIENT_SECRET = ""
# --------------------

# --- SQLite DB 설정 ---
DATABASE = 'search.db'

def get_db():
    """
    요청(Request)별로 유일한 DB 커넥션을 생성하거나 반환합니다.
    """
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        # 결과를 딕셔너리 형태로 받기 위해 row_factory 설정
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    """요청이 끝날 때 DB 커넥션을 닫습니다."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# --- DB 테이블 정의 스크립트 ---
# 'search_log' 테이블이 없으면 생성합니다.
DB_SCHEMA_SCRIPT = """
CREATE TABLE IF NOT EXISTS search_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

def setup_database():
    """앱 시작 시 DB 테이블을 확인하고 생성합니다."""
    print("데이터베이스 설정 중...")
    db = sqlite3.connect(DATABASE)
    db.cursor().executescript(DB_SCHEMA_SCRIPT)
    db.commit()
    db.close()
    print("데이터베이스 설정 완료.")
# -------------------------

@app.route('/')
def index():
    """메인 HTML 페이지를 렌더링합니다."""
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search_blog():
    """검색 요청을 처리하고, 검색어를 DB에 저장합니다."""
    
    data = request.get_json()
    if not data or 'query' not in data:
         return jsonify({"error": "JSON 요청 형식이 잘못되었습니다."}), 400
         
    query = data.get('query').strip() # 양 끝 공백 제거

    if not query:
        return jsonify({"error": "검색어가 없습니다."}), 400

    #! ----- DB에 검색어 저장 -----
    try:
        db = get_db()
        # 사용자가 입력한 검색어를 그대로 저장
        db.execute('INSERT INTO search_log (query) VALUES (?)', (query,))
        db.commit()
    except sqlite3.Error as e:
        print(f"DB 저장 오류: {e}")
        # DB 오류가 나더라도 검색 기능 자체는 작동하도록 로깅만 합니다.
    #! --------------------------

    # --- 네이버 API 요청 로직 ---
    api_url = "https://openapi.naver.com/v1/search/blog.json"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }
    params = {
        "query": query + " 맛집",  #! 수정: ' 맛집'을 자동으로 추가하여 맛집 검색이 되도록 변경
        "display": 10,   # 10개 결과
        "sort": "sim"    # 정확도순
    }

    try:
        response = requests.get(api_url, headers=headers, params=params)
        response.raise_for_status() # 오류 발생 시 예외 처리
        search_data = response.json()
        return jsonify(search_data)

    except requests.exceptions.HTTPError as err:
        # API에서 4xx, 5xx 오류 반환 시
        return jsonify({"error": f"API 오류: {err.response.status_code}", "message": err.response.text}), err.response.status_code
    except requests.exceptions.RequestException as e:
        # 네트워크 오류 등
        return jsonify({"error": str(e)}), 500

#! ----- [신규] 인기 검색어 순위 페이지 -----
@app.route('/rank')
def rank():
    """DB에서 검색어 순위를 집계하여 페이지를 렌더링합니다."""
    try:
        db = get_db()
        # 검색어를 그룹화하고, 많이 검색된 순(DESC)으로 10개만 가져옵니다.
        cursor = db.execute(
            'SELECT query, COUNT(query) as count '
            'FROM search_log '
            'GROUP BY query '
            'ORDER BY count DESC '
            'LIMIT 10'
        )
        rankings = cursor.fetchall() # 예: [ {'query': '강남역', 'count': 5}, ... ]
        
        # rank.html 템플릿에 rankings 데이터를 전달합니다.
        return render_template('rank.html', rankings=rankings)
        
    except sqlite3.Error as e:
        print(f"DB 조회 오류: {e}")
        return render_template('rank.html', rankings=[], error="순위를 불러오는 데 실패했습니다.")
# ------------------------------------

if __name__ == '__main__':

    app.run(debug=True, host='0.0.0.0')

    setup_database() #! 앱 실행 전 DB 테이블 생성 확인
    app.run(debug=True, port=5000)
