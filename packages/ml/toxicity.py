from lang import detect_potential_langs
import time
from detoxify import Detoxify

import time

start_time = time.time()
multilingual_model = Detoxify('multilingual')
print(f"Time to load multilingual model: {time.time() - start_time:.2f} seconds")

start_time = time.time()
original_model = Detoxify('original')
print(f"Time to load original model: {time.time() - start_time:.2f} seconds")

def get_predicted_labels(model, text):
    results = model.predict(text)
    labels = [label for label, value in results.items() if value > 0.5]
    return labels

multilingual_model_langs = ['IT', 'FR', 'ES', 'PT', 'RU', 'TR']

def detect_toxicity(texts):
    start_time = time.time()
    results = set()
    for text in texts:
        langs = detect_potential_langs(text)
        if 'EN' in langs:
            results.update(get_predicted_labels(original_model, text))
        if any(lang in multilingual_model_langs for lang in langs):
            results.update(get_predicted_labels(multilingual_model, text))
    results = list(results)
    end_time = time.time()
    elapsed_time_ms = (end_time - start_time) * 1000
    print(f"Time taken: {elapsed_time_ms:.2f} ms")
    return results
