from transformers import AutoTokenizer, AutoModelForTokenClassification
from transformers import pipeline
import re

models = {}
tokenizers = {}

default_patterns = [
    {"label": "email", "expression": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"},
    {"label": "phone", "expression": r"\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})"}, # US
    {"label": "phone", "expression": r"((\+44\s?\d{4}|\(?0\d{4}\)?)\s?\d{3}\s?\d{3})|((\+44\s?\d{3}|\(?0\d{3}\)?)\s?\d{3}\s?\d{4})|((\+44\s?\d{2}|\(?0\d{2}\)?)\s?\d{4}\s?\d{4})"}, # UK
    {"label": "phone", "expression": r"^(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})$"}, # FR
    {"label": "phone", "expression": r"(\(?([\d \-\)\–\+\/\(]+){6,}\)?([ .\-–\/]?)([\d]+))"}, # Germany
    {"label": "phone", "expression": r"(?:(?:\+|00)86)?1(?:(?:3[\d])|(?:4[5-79])|(?:5[0-35-9])|(?:6[5-7])|(?:7[0-8])|(?:8[\d])|(?:9[189]))\d{8}"}, # China
    {"label": "phone", "expression": r"((\+*)((0[ -]*)*|((91 )*))((\d{12})+|(\d{10})+))|\d{5}([- ]*)\d{6}"}, # India
    {"label": "phone", "expression": r"(^\+[0-9]{2}|^\+[0-9]{2}\(0\)|^\(\+[0-9]{2}\)\(0\)|^00[0-9]{2}|^0)([0-9]{9}$|[0-9\-\s]{10}$)"}, # Sweden & Dutch
    {"label": "ssn", "expression": r"(?!666|000|9\d{2})\d{3}-(?!00)\d{2}-(?!0{4})\d{4}"}
]

def detect_regex(texts, type, custom_patterns=[]):

    all_patterns = default_patterns + custom_patterns
    all_patterns = [pattern for pattern in all_patterns if pattern["label"] == type]

    results = []
    for text in texts:
        for pattern in all_patterns:
            found_items = re.findall(pattern["expression"], text)
            for item in found_items:
                if isinstance(item, tuple):
                    results.extend([i.strip() for i in item if i])
                else:
                    results.append(item.strip())

    return list(set(results))

def load_ner_model(model_id):
    if model_id not in models:
        print(f"Loading NER model: {model_id}")
        tokenizers[model_id] = AutoTokenizer.from_pretrained(model_id)
        models[model_id] = AutoModelForTokenClassification.from_pretrained(model_id)

def parse_entity_type(entity):
    lower_entity = entity.lower()

    parts = lower_entity.split("-")
    second_part = parts[1] if len(parts) > 1 else lower_entity

    if second_part.startswith("per"):
        return "person"
    elif second_part.startswith("loc"):
        return "location"
    elif second_part.startswith("org"):
        return "org"
    elif second_part.startswith("misc"):
        return "misc"
    else:
        return "misc"

def get_ner_labels(model_id, texts, entities):
    global tokenizer
    global model

    load_ner_model(model_id)

    nlp = pipeline("ner", model=models[model_id], tokenizer=tokenizers[model_id])
    
    results = {}

    for text in texts:
        ner_results = nlp(text)
        entities = {}

        current_entity = {"name": "", "score": 0, "type": "", "word_count": 0}

        for word in ner_results:

            full_entity_type = word['entity']  # Get full entity type e.g., B-Person
            entity_prefix = full_entity_type.split("-")[0]
            entity_type = parse_entity_type(full_entity_type)

            if entity_type not in entities:
                entities[entity_type] = []

            cleaned_word = word['word']

            if "##" in cleaned_word:
                current_entity['name'] += cleaned_word.replace("##", "")
                current_entity['score'] += word['score']
                current_entity['word_count'] += 1
            elif entity_prefix == "I":
                current_entity['name'] += " " + cleaned_word
                current_entity['score'] += word['score']
                current_entity['word_count'] += 1
            else:
                if current_entity['word_count'] > 0 and current_entity['score'] / current_entity['word_count'] > 0.5 and current_entity['type']:
                    entities[current_entity['type']].append(current_entity['name'].strip())
                current_entity = {"name": cleaned_word, "score": word['score'], "type": entity_type, "word_count": 1}

        # Check for the last entity
        if current_entity['word_count'] > 0 and current_entity['score'] / current_entity['word_count'] > 0.5 and current_entity['type']:
            entities[current_entity['type']].append(current_entity['name'].strip())

        for type in entities:
            results.setdefault(type, []).extend(entities.get(type, []))

    return results

# Allow loading custom HF NER model
# Default model supports officialy: ar, de, en, es, fr, it, lv, nl, pt, zh
# But also works decntly for other languages
def detect_pii(texts, entities, model_id, custom_patterns=[]):

    if model_id == None:
        model_id = "Davlan/bert-base-multilingual-cased-ner-hrl"

    results = {}
    ner_types = ["person", "location", "org", "misc"]

    # if ner types in types, use get_ner_labels
    if any(ner_type in entities for ner_type in ner_types):
        results = get_ner_labels(model_id, texts, entities)

    # for all other types, use regex
    for type in entities:
        if type not in ner_types:
            results.setdefault(type, []).extend(detect_regex(texts, type, custom_patterns))

    return results

