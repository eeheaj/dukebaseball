import re
from difflib import SequenceMatcher

_STOPWORDS = {"inc", "llc", "co", "corp", "company", "the", "store", "restaurant"}


def _normalize(name: str) -> str:
    words = re.sub(r"[^a-z0-9 ]+", " ", name.lower()).split()
    return " ".join(w for w in words if w not in _STOPWORDS and not w.isdigit())


def _score(vendor: str, company: str) -> float:
    v, c = _normalize(vendor), _normalize(company)
    if not v or not c:
        return 0.0
    # Containment covers OCR vendors like "CHICK-FIL-A #0123 DURHAM NC".
    if c in v or v in c:
        return 1.0
    ratio = SequenceMatcher(None, v, c).ratio()
    shared = set(v.split()) & set(c.split())
    token_overlap = len(shared) / len(set(c.split()))
    return max(ratio, token_overlap)


def match_partnership(vendor: str | None, partnerships: list[dict], threshold: float = 0.6) -> str | None:
    """Return the id of the partnership whose company best matches the OCR vendor, if any."""
    if not vendor:
        return None
    best_id, best = None, 0.0
    for p in partnerships:
        s = _score(vendor, p.get("company", ""))
        if s > best:
            best_id, best = p.get("id"), s
    return best_id if best >= threshold else None
