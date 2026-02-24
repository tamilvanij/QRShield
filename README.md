# QRShield — Student MVP

Simple full-stack student project that analyzes URLs (from QR codes or paste) and scores them for risk.

Structure
- `backend/` — FastAPI app
- `frontend/` — Static HTML/CSS/JS (camera QR scanning via html5-qrcode)

Quick run (backend)

1. Create and activate a Python environment (recommended):

Windows (PowerShell):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
python backend\main.py
```

This starts the API on `http://localhost:9000` by default.

Quick run (frontend)

Open `frontend/index.html` in a browser. For camera access prefer serving via a local static server:

Python simple server from `frontend` folder:
```powershell
cd frontend
python -m http.server 5500
```
Then open `http://localhost:5500`.

Notes
- The backend provides `POST /analyze` accepting JSON `{ "url": "..." }` and returns `{ "risk_score": number, "status": "Safe|Suspicious|Dangerous", "reason": "..." }`.
- Heuristics are intentionally simple and modular for student learning and improvement.
