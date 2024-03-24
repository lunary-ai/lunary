from flask import Flask, request, jsonify
from lang import detect_lang
from toxicity import detect_toxicity
from pii import detect_pii

app = Flask(__name__)

@app.route('/lang', methods=['POST'])
def language_route():
    text = request.json['text']
    result = detect_lang(text)
    return jsonify(result)

@app.route('/toxicity', methods=['POST'])
def toxicity_route():
    texts = request.json['texts']
    results = detect_toxicity(texts)
    return jsonify(results)

@app.route('/pii', methods=['POST'])
def pii_route():
    model_id = request.json.get('bert_model', None)
    custom_patterns = request.json.get('custom_patterns', [])
    texts = request.json['texts']
    entities = request.json['entities']
    results = detect_pii(texts, entities, model_id, custom_patterns)
    return jsonify(results)

if __name__ == '__main__':
    app.run(host='localhost', port=4242)

print("Python Flask Server is running on port 4242")
