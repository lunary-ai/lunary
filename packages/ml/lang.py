import time
from lingua import Language, LanguageDetectorBuilder

# Only include most popular languages for performance 
languages = [Language.ENGLISH, Language.FRENCH, Language.GERMAN, Language.SPANISH, Language.ITALIAN, Language.DUTCH, Language.PORTUGUESE, Language.RUSSIAN, Language.SWEDISH, Language.ICELANDIC, Language.DANISH, Language.FINNISH, Language.HUNGARIAN, Language.CZECH, Language.SLOVAK, Language.POLISH, Language.ROMANIAN, Language.BULGARIAN, Language.GREEK, Language.TURKISH, Language.ARABIC, Language.HEBREW, Language.HINDI, Language.BENGALI, Language.TAMIL, Language.URDU, Language.PUNJABI, Language.THAI,Language.VIETNAMESE, Language.INDONESIAN, Language.MALAY,  Language.AFRIKAANS, Language.CHINESE, Language.JAPANESE, Language.KOREAN, Language.CZECH, Language.PERSIAN]

# with_low_accuracy_mode() is faster and takes less memory but works as well with longer inputs
detector = LanguageDetectorBuilder.from_languages(*languages).with_low_accuracy_mode().build()

def detect_potential_langs(text):
    langs = detector.compute_language_confidence_values(text)
    # only keep those with a confidence value greater than 5%
    langs = [lang for lang in langs if lang.value > 0.05]

    # return only the language code
    codes = [lang.language.iso_code_639_1.name for lang in langs]
    return codes

def detect_lang(text):
    lang = detector.detect_language_of(text)
    return lang.language.iso_code_639_1.name