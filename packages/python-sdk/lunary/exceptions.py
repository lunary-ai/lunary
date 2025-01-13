class LunaryError(Exception):
    """Base exception for all Lunary errors"""
    pass

class TemplateError(LunaryError):
    """Raised when there's any error with templates"""
    pass

class DatasetError(LunaryError):
    """Raised when there's any error with datasets"""
    pass

class EvaluationError(LunaryError):
    """Raised when there's any error with evaluations"""
    pass

class ThreadError(LunaryError):
    """Raised when there's any error with thread operations"""
    pass

class FeedbackError(LunaryError):
    """Raised when there's any error with feedback operations"""
    pass

class ScoringError(LunaryError):
    """Raised when there's any error with scoring operations"""
    pass