from flask import Flask, request, jsonify
from lang import detect_lang
from profanity import detect_profanity
from pii import detect_pii

app = Flask(__name__)

@app.route('/lang', methods=['POST'])
def language_route():
    text = request.json['text']
    result = detect_lang(text)
    return jsonify(result)

@app.route('/profanity', methods=['POST'])
def profanity_route():
    texts = request.json['texts']
    results = detect_profanity(texts)
    return jsonify(results)

@app.route('/pii', methods=['POST'])
def ner_route():
    model_id = request.json['bert_model']
    custom_patterns = request.json['custom_patterns']
    texts = request.json['texts']
    types = request.json['types']
    results = detect_pii(texts, types, model_id, custom_patterns)
    return jsonify(results)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=4242)

print("Python Flask Server is running on port 4242")
