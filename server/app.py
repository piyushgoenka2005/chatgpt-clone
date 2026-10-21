import os
from flask import Flask

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TEMPLATE_DIR = os.path.join(BASE_DIR, "client", "html")
if not os.path.exists(TEMPLATE_DIR):
    TEMPLATE_DIR = os.path.join(os.getcwd(), "client", "html")

app = Flask(__name__, template_folder=TEMPLATE_DIR)
app.secret_key = os.getenv("SECRET_KEY", "chatgpt-clone-super-secure-session-key-2026")
