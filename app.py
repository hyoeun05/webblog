from flask import Flask, render_template, request, jsonify
import requests
import json 
app = Flask(__name__)

NAVER_CLIENT_ID = "9Q6o2Qnqn3TztgCqMwEQ" 
NAVER_CLIENT_SECRET = "YECVfxIHm6"

@app.route('/blog')
def index():
    return render_template('index.html')

@app.route('/blog', methods=['POST'])
def search_blog():
    """클라이언트로부터 검색어를 받아 네이버 API에 블로그 검색을 요청합니다."""
    
    # 1. 클라이언트가 보낸 JSON 데이터에서 'query'를 추출
    data = request.get_json()
    query = data.get('query')

    if not query:
        return jsonify({"error": "검색어가 없습니다."}), 400

    # 2. 네이버 검색 API (블로그) URL
    api_url = "https://openapi.naver.com/v1/search/blog.json"

    # 3. API 요청 헤더 설정
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }

    # 4. API 요청 파라미터 설정
    params = {
        "query": query,  
        "display": 10,           
    }

    try:
        # 5. 네이버 API에 GET 요청
        response = requests.get(api_url, headers=headers, params=params)
        response.raise_for_status() # 오류 발생 시 예외 처리
        
        # 6. 결과를 JSON으로 변환하여 클라이언트에 반환
        search_data = response.json()
        return jsonify(search_data)

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)