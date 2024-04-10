from flask import Flask, request, jsonify
from lang import detect_lang
from toxicity import detect_toxicity
from pii import detect_pii
import sys

app = Flask(__name__)

# Disable the Flask red warning server banner
cli = sys.modules['flask.cli']
cli.show_server_banner = lambda *x: None

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/lang', methods=['POST'])
def language_route():
    text = request.json.get('text', '')
    result = detect_lang(text)
    return jsonify(result)

@app.route('/toxicity', methods=['POST'])
def toxicity_route():
    texts = request.json.get('texts', [])
    results = detect_toxicity(texts)
    return jsonify(results)

# TODO: index errors
@app.route('/pii', methods=['POST'])
def pii_route():
    model_id = request.json.get('bert_model', None)
    custom_patterns = request.json.get('custom_patterns', [])
    texts = request.json.get('texts', [])
    entities = request.json.get('entities', [])
    results = detect_pii(texts, entities, model_id, custom_patterns)
    return jsonify(results)

if __name__ == '__main__':
    app.run(host='localhost', port=4242)

print("Python ML Server running on port 4242")
