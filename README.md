# ChatGPT Clone

A feature-rich, responsive, and deployment-ready **ChatGPT Clone** powered by OpenAI's **GPT-4o-mini**, Flask, and MongoDB Atlas. It supports persistent user authentication, conversation history, document and image attachments, and clean Indian Standard Time (IST) timestamp tracking.

Designed for seamless local development and 1-click deployment on **Vercel Serverless**.

---

## ✨ Key Features

- **🤖 OpenAI GPT-4o-mini Powered**: Fast, intelligent conversational AI with real-time text streaming.
- **👁️ Multimodal Vision Support**: Attach and analyze images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`) directly in conversation.
- **📄 Document Upload & Parsing**: Upload `.pdf`, `.docx`, `.txt`, `.csv`, `.md`, `.json`, and source code files. Text is extracted server-side and injected into conversation context.
- **🧠 Full Context Continuity**: Preserves conversation history across multi-turn prompts (e.g., SWOT analyses, coding sessions, recursive questions).
- **🔒 Secure Authentication**: Email and password registration and login with bcrypt hashing and session management.
- **💾 Cloud Database (MongoDB Atlas)**:
  - Persistent chat history and prompt storage per user.
  - Individual chat deletion synchronized with MongoDB.
  - Native **IST (Indian Standard Time)** timestamps (`YYYY-MM-DD HH:MM:SS`) for optimized data storage and human readability.
- **🎨 Sleek, Modern UI**: Dark and light themes, code syntax highlighting, responsive sidebar, auto-resizing input box, and smooth transitions.
- **⚡ Vercel Ready**: Preconfigured with `vercel.json` and `api/index.py` for deployment without server management.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Python 3.10+
- MongoDB Atlas account (free M0 cluster works great)
- OpenAI API Key

### 2. Clone Repository
```bash
git clone https://github.com/piyushgoenka2005/chatgpt-clone.git
cd chatgpt-clone
```

### 3. Setup Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Configure Credentials
Copy `config.example.json` to `config.json` (or set environment variables):
```bash
cp config.example.json config.json
```
Edit `config.json` with your credentials:
```json
{
  "openai_key": "sk-proj-your-openai-api-key",
  "openai_api_base": "https://api.openai.com",
  "mongo_uri": "mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority",
  "mongo_db": "chatgpt_clone",
  "secret_key": "your-random-session-secret-key"
}
```

### 6. Run the Application
```bash
python run.py
```
Open [http://localhost:1338](http://localhost:1338) in your browser.

---

## ☁️ Deploy to Vercel

This repository is optimized for **Vercel Serverless Functions**.

### Step 1: Push to GitHub
Ensure your repository is pushed to your GitHub account:
```bash
git push origin main
```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Select your GitHub repository (`chatgpt-clone`).
4. Framework Preset: **Other**.
5. Root Directory: `./` (leave default).

### Step 3: Add Environment Variables
In the Vercel project settings under **Environment Variables**, add:

| Variable Name | Description | Example Value |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI API secret key | `sk-proj-...` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `MONGO_DB` | MongoDB database name | `chatgpt_clone` |
| `SECRET_KEY` | Flask session secret key | `any-random-long-secret-key` |

### Step 4: Deploy
Click **Deploy**. Vercel will build the Python serverless environment and deploy the application.

---

## 📁 Project Structure

```
chatgpt-clone/
├── api/
│   └── index.py            # Vercel Serverless WSGI entrypoint & route mapper
├── client/
│   ├── html/
│   │   ├── index.html      # Main chat interface
│   │   ├── login.html      # Authentication portal
│   │   └── register.html   # User sign-up
│   ├── css/
│   │   └── style.css       # Responsive dark/light theme stylesheet
│   ├── js/
│   │   ├── chat.js         # Chat streaming, vision, document uploads & history
│   │   └── sidebar.js      # Sidebar toggle & conversation switching
│   └── img/                # UI icons and branding assets
├── server/
│   ├── app.py              # Flask app initialization & template paths
│   ├── backend.py          # Chat API endpoints, OpenAI client, document parser
│   ├── db.py               # MongoDB Atlas connection & CRUD operations
│   └── website.py          # Static and page routing handlers
├── config.example.json     # Configuration template
├── requirements.txt        # Production Python dependencies
├── vercel.json             # Vercel runtime build & routing configuration
├── run.py                  # Local development server runner
└── README.md
```

---

## 🔒 Security Best Practices
- Never commit `config.json` containing live credentials to public repositories (it is listed in `.gitignore`).
- On Vercel, always inject sensitive credentials using Vercel's encrypted Environment Variables.
- Ensure your MongoDB Atlas cluster has IP Access configured (set `0.0.0.0/0` in MongoDB Network Access to allow Vercel dynamic IP connections).

---

## 📄 License
This project is open-source and available under the [GNU General Public License v3.0](LICENSE).
