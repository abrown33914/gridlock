import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "projects.json"

_cache = None

def load():
    global _cache
    if _cache is None:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            _cache = json.load(f)
    return _cache

def nodes():
    return load()["nodes"]

def projects():
    return load()["projects"]