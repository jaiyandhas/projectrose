# Project Rose: AI Answer Evaluator

Project Rose is a production-grade, full-stack web application designed to evaluate written answers based on specific scoring criteria. It provides detailed numerical scores (originality, concept coverage, AI usage, and overall score) along with structured qualitative feedback. It features a modern, startup-style SaaS feel and a Human-in-the-Loop (HITL) system for manual scoring and continuous model refinement.

## 🚀 Features

- **AI-Powered Evaluation**: Parses and scores written answers against expected criteria using NLP (spaCy) and advanced ML methods.
- **Human-in-the-Loop (HITL)**: Administrators can manually review and grade answers. This data is used to continuously train and improve the evaluation model.
- **Detailed Analytics Dashboard**: View historical evaluations, distribution of scores, and track improvements over time.
- **Modern Split-Panel UI**: A responsive, sleek interface built with React, Next.js, and Tailwind CSS.
- **Secure Authentication**: User authentication and session management handled natively via Supabase.
- **Rate-Limited API**: Backend endpoints are secured against abuse using `slowapi`.

## 🛠 Tech Stack

**Frontend**
- Next.js (React)
- Tailwind CSS
- Vercel (Deployment)

**Backend**
- Python 3
- FastAPI
- spaCy & Scikit-Learn
- Supabase (PostgreSQL for user management and evaluations)

---

## 💻 Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- A Supabase project

### 1. Clone the repository
```bash
git clone <repository-url>
cd ProjectRose
```

### 2. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory based on the `.env.local.example` and add your keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
```

Start the frontend development server:
```bash
npm run dev
```

### 3. Backend Setup
Navigate to the backend directory and create a virtual environment:
```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install the required Python packages:
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

Create a `.env` file in the `backend` directory based on the `.env.example` and add your keys:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_api_key
```

Start the FastAPI application:
```bash
python main.py
```
*The backend should now be running on `http://localhost:8000`.*

---

## 📚 Project Structure

```text
ProjectRose/
├── backend/          # FastAPI application, ML models, and routers
├── frontend/         # Next.js frontend, UI components, and API services
└── database/         # Database initialization scripts and Supabase configurations
```

## 🤝 Contributing
Contributions are welcome! Please ensure all pull requests follow the standard coding guidelines formatting.
