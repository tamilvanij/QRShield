from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import urlparse
import re

app = FastAPI(title="QRShield - URL risk analyzer")

# Allow local frontend to call the API. Adjust origins as needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    url: str


class AnalyzeResponse(BaseModel):
    risk_score: int
    status: str
    reason: str


# --- Heuristic scoring helpers ---
SHORTENER_DOMAINS = {
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'ow.ly', 'buff.ly', 'rb.gy'
}

SUSPICIOUS_KEYWORDS = [
    'login', 'verify', 'account', 'password', 'free-money', 'free', 'prize', 'reward', 'bank', 'card', 'crypto', 'bitcoin', 'secure', 'confirm', 'update'
]


def is_ip_hostname(parsed):
    # hostname is numeric IP
    hostname = parsed.hostname or ''
    return bool(re.match(r'^(\d{1,3}\.){3}\d{1,3}$', hostname))


def contains_suspicious_keyword(url: str):
    lower = url.lower()
    found = [k for k in SUSPICIOUS_KEYWORDS if k in lower]
    return found


def is_shortened(hostname: str):
    if not hostname:
        return False
    return any(hostname.endswith(d) for d in SHORTENER_DOMAINS)


def special_char_ratio(path_and_query: str):
    if not path_and_query:
        return 0.0
    specials = sum(1 for c in path_and_query if not c.isalnum())
    return specials / max(1, len(path_and_query))


def compute_risk_score(url: str) -> (int, str):
    try:
        parsed = urlparse(url)
    except Exception:
        return 100, "Malformed URL"

    score = 0
    reasons = []

    # Basic sanity checks
    if not parsed.scheme.startswith('http') or not parsed.netloc:
        score += 40
        reasons.append('Missing or non-HTTP scheme')

    # IP as hostname
    if is_ip_hostname(parsed):
        score += 25
        reasons.append('URL uses raw IP instead of domain')

    # Shortener
    hostname = parsed.hostname or ''
    if is_shortened(hostname):
        score += 30
        reasons.append('Shortened URL domain detected')

    # Suspicious keywords
    found_keywords = contains_suspicious_keyword(url)
    if found_keywords:
        add = min(35, 10 + 5 * len(found_keywords))
        score += add
        reasons.append(f"Suspicious keywords: {', '.join(found_keywords)}")

    # Length
    total_len = len(url)
    if total_len > 120:
        score += 20
        reasons.append('Very long URL')
    elif total_len > 80:
        score += 10

    # Special character ratio
    path_q = (parsed.path or '') + (('?' + parsed.query) if parsed.query else '')
    ratio = special_char_ratio(path_q)
    if ratio > 0.35:
        score += 20
        reasons.append('High special-character ratio in path/query')
    elif ratio > 0.2:
        score += 10

    # Too many subdomains
    subdomains = hostname.split('.') if hostname else []
    if len(subdomains) >= 4:
        score += 8
        reasons.append('Multiple subdomains')

    # Cap score
    score = max(0, min(100, int(score)))

    # Build explanation
    reason = ' | '.join(reasons) if reasons else 'No obvious issues detected.'

    return score, reason


def status_from_score(score: int) -> str:
    if score <= 30:
        return 'Safe'
    if score <= 70:
        return 'Suspicious'
    return 'Dangerous'


@app.post('/analyze', response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest):
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail='URL is required')

    # Normalize simple cases
    if not re.match(r'^https?://', url):
        url = 'http://' + url

    score, reason = compute_risk_score(url)
    status = status_from_score(score)

    return AnalyzeResponse(risk_score=score, status=status, reason=reason)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=9000, reload=True)
