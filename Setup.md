# 🛍️ ABSA — Clothing Review Analyzer
## Complete Setup & Execution Guide

This document provides step-by-step instructions to set up, configure, and run both the **FastAPI Backend** and the **React Frontend** for the Aspect-Based Sentiment Analysis (ABSA) system.

---

## 📌 Architecture Overview

```
User Browser (React UI on :3000)
       ↓  (Axios REST requests)
FastAPI Backend (Uvicorn on :8000)
       ↓
NLP Pipeline (NLTK Tokenizer & Aspect Detector)
       ↓
ML/DL Inference (DistilBERT / LR / SVM / CNN-BiLSTM)
       ↓
MongoDB (Atlas / Local storage for history & analytics)
```

---

## ⚙️ Prerequisites

Before you start, make sure you have the following installed on your machine:

1. **Python 3.10+** (Python 3.12 recommended)
2. **Node.js 18+** and **npm**
3. **MongoDB** (Local Community Server or MongoDB Atlas cloud connection URI)
4. **Git**

---

## 🚀 1. Backend Setup & Run

### Step 1.1: Open Terminal in Project Root
```powershell
cd e:\MajorProject\absa-project-master
```

### Step 1.2: Activate Python Virtual Environment
If you already have the `venv` folder created:

- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\activate
  ```
- **Windows (Command Prompt):**
  ```cmd
  venv\Scripts\activate.bat
  ```
- **Linux / macOS:**
  ```bash
  source venv/bin/activate
  ```

*(If creating a new virtual environment from scratch: `python -m venv venv`)*

### Step 1.3: Install Dependencies
```powershell
pip install -r requirements.txt
```

> [!TIP]
> **Pydantic Compatibility Note**:
> If you encounter a `SystemError: The installed pydantic-core version (...) is incompatible with the current pydantic version`, simply run:
> ```powershell
> pip install pydantic==2.13.4 pydantic-core==2.46.4
> ```
> or:
> ```powershell
> pip install --upgrade "pydantic-core==2.46.5"
> ```

### Step 1.4: Download Required NLTK Corpora
```powershell
python -c "import nltk; nltk.download('stopwords'); nltk.download('punkt'); nltk.download('punkt_tab'); nltk.download('wordnet'); nltk.download('omw-1.4')"
```
*(Note: `text_preprocessor.py` also checks and downloads these automatically if missing)*

### Step 1.5: Verify Models
Ensure your pre-trained models are present in the `models_saved/` directory:
- `models_saved/lr_model.pkl`
- `models_saved/tfidf_vectorizer.pkl`
- `models_saved/svm_model.pkl` (optional)
- `models_saved/distilbert_finetuned/` (optional)

*(If models need to be trained, execute `python train_models.py`)*

### Step 1.6: Run the FastAPI Server
```powershell
python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Base URL**: `http://localhost:8000`
- **Interactive API Documentation (Swagger)**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/health`

---

## 💻 2. Frontend Setup & Run

### Step 2.1: Open a Second Terminal & Navigate to `frontend/`
```powershell
cd e:\MajorProject\absa-project-master\frontend
```

### Step 2.2: Install NPM Dependencies (First time only)
```powershell
npm install
```

### Step 2.3: Start the Development Server
```powershell
npm start
```

The application will start and automatically open in your default browser at:
👉 **`http://localhost:3000`**

### Step 2.4: Production Build (Optional)
To verify or compile the production distribution bundle:
```powershell
npm run build
```
The optimized bundle will be created inside `frontend/build/`.

---

## 🧭 3. Application Features & Verification

Once both servers are running, test each of the five application tabs:

1. **📝 Single Review**:
   - Type or paste an individual clothing review (e.g., *"The fabric is super soft but the size runs really small. Color is beautiful!"*).
   - Click **Analyze Review** to view overall sentiment, detected aspects, keyword tags, context quotes, and the sentiment confidence chart.

2. **🗂️ Batch Analysis**:
   - Upload a `.csv` dataset file or paste multiple reviews (one per line).
   - Click **Analyze Batch** to process reviews in bulk.
   - Toggle between **Results table** and **Sentiment Distribution donut chart**, or click **Export CSV** to download all analyzed records.

3. **📊 Analytics Dashboard**:
   - Review global KPI metrics: Total Analyzed, Positive, Negative, and Neutral counts.
   - Filter by clothing department (*Bottoms, Dresses, Intimates, Jackets, Tops*).
   - Inspect aspect-wise sentiment distribution charts.

4. **🤖 Model Comparison**:
   - Compare performance benchmarks across **DistilBERT**, **CNN-BiLSTM**, **SVM**, and **Logistic Regression**.
   - Review accuracy, precision, recall, F1-scores, and interactive confusion matrices.

5. **🕓 History**:
   - View previously analyzed reviews stored in the database.
   - Filter by sentiment class (*ALL, POSITIVE, NEGATIVE, NEUTRAL*) and department.
   - Click any record to expand and view detailed aspect breakdowns.
   - Export filtered history as CSV.

---

## 🛠️ 4. Common Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`Failed to connect to API`** | Backend is not running on port 8000 | Ensure `uvicorn src.api.main:app --port 8000` is active in another terminal. |
| **`ModuleNotFoundError`** | Python dependencies missing | Activate `venv` and run `pip install -r requirements.txt`. |
| **`pydantic-core` version mismatch** | Outdated or mismatched pydantic build | Run `pip install pydantic==2.13.4 pydantic-core==2.46.4`. |
| **Port 3000 or 8000 in use** | Another instance is already bound | Terminate existing processes on that port or specify an alternate port (`--port 8001`). |
| **`MongoDB connection error`** | Database service inactive | MongoDB is non-critical for basic single/batch analysis; for history persistence, verify your local MongoDB service is started or configure Atlas connection URI. |
