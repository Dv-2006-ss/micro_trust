# Micro-Trust V2: Alternative Credit Scoring System
*B.Sc. Data Science Capstone Project*

Micro-Trust V2 is a "Zero-Trust", production-ready microservices architecture designed to perform alternative credit scoring and risk assessment on unstructured financial documents (passbooks, statements) while guaranteeing complete data ephemerality. 

## System Architecture Overview
* **Frontend**: Angular 21 (Zoneless, Signal State Management via `resource()` primitive)
* **API Orchestrator**: Node.js (Express, Mongoose)
* **Intelligence Engine**: Python (FastAPI, Scikit-Learn, XGBoost, PyTesseract)
* **Database**: MongoDB Atlas with AES-256 Field-Level Encryption (FLE)

---

## 🏗 Operations (IPO Table)

| Input | Process | Output |
| :--- | :--- | :--- |
| **Merchant ID & Passbook Image** (.png, .pdf) uploaded via Angular UI. | Node streams file directly to Python (**No local disk persistence**). | Fast delivery over stream buffer. |
| **Multipart Stream** buffer hits FastAPI. | Security: `ocr_processor.py` loads image to memory, parses text, then forces memory wipe (`gc.collect()`). | Extract dummy metrics & structured JSON representations. |
| **Extracted Tabular Feature Set** | ML Intelligence: Scaled via `StandardScaler()`. **K-Means** predicts merchant persona. **XGBoost** predicts risk probability & approval status. | Credit Score (300-800), Status, Persona, Suggested Interest Rate. |
| **Final JSON Report** | Node.js `.json()` handler fires `secureDelete` middleware destroying any trace buffers on OS level. Mongoose encrypts ID keys via FLE before MongoDB sync. | Final Glassmorphism Trust Report displaying matching Banks dynamically sorted. |

---

## 🛠 Tesseract OCR Setup Instructions
Because we utilize high-precision OCR processing via `pytesseract` natively in Python, the underlying Tesseract C++ engine must be installed on your OS.

### Windows
1. Download the Tesseract installer from [UB-Mannheim Setup Repository](https://github.com/UB-Mannheim/tesseract/wiki).
2. Install Tesseract locally (Default path: `C:\Program Files\Tesseract-OCR`).
3. Add the installation directory to your System **Environment Variables** -> `PATH`.
4. *(Optional)* Provide path explicitly in `ocr_processor.py` if PATH propagation fails:
   `pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'`

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install tesseract-ocr
sudo apt install libtesseract-dev
```

### macOS
```bash
brew install tesseract
```

---

## 🚀 Deployment Targets
- frontend/: Vercel
- backend/ & intelligence-engine/: Render
