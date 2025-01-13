import uuid, hashlib 

def clean_nones(value):
    """
    Recursively remove all None values from dictionaries and lists, and returns
    the result as a new dictionary or list.
    """
    try:
        if isinstance(value, list):
            return [clean_nones(x) for x in value if x is not None]
        elif isinstance(value, dict):
            return {
                key: clean_nones(val)
                for key, val in value.items()
                if val is not None
            }
        else:
            return value
    except Exception as e:
        return value  

def create_uuid_from_string(seed_string):
    seed_bytes = seed_string.encode('utf-8')
    sha256_hash = hashlib.sha256()
    sha256_hash.update(seed_bytes)
    hash_hex = sha256_hash.hexdigest()
    uuid_hex = hash_hex[:32]
    uuid_obj = uuid.UUID(uuid_hex)
    return uuid_obj
