import os
import sys
from json import load
import traceback

# Ensure repository root and cwd are on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
for p in [BASE_DIR, os.getcwd(), os.path.dirname(__file__)]:
    if p and p not in sys.path:
        sys.path.insert(0, p)

try:
    from server.app import app
    from server.website import Website
    from server.backend import Backend_Api
except Exception as e:
    print(f"FATAL error importing server modules: {e}")
    traceback.print_exc()
    raise

config_path = os.path.join(BASE_DIR, 'config.json')
config = {}
if os.path.exists(config_path):
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = load(f)
    except Exception as e:
        print("Config file read notice:", e)

# Environment variables take priority (ideal for Vercel deployment)
if os.getenv('OPENAI_API_KEY'):
    config['openai_key'] = os.getenv('OPENAI_API_KEY')
if os.getenv('OPENAI_API_BASE'):
    config['openai_api_base'] = os.getenv('OPENAI_API_BASE')
if os.getenv('MONGO_URI'):
    config['mongo_uri'] = os.getenv('MONGO_URI')
if os.getenv('MONGO_DB'):
    config['mongo_db'] = os.getenv('MONGO_DB')
if os.getenv('SECRET_KEY'):
    config['secret_key'] = os.getenv('SECRET_KEY')
    app.secret_key = os.getenv('SECRET_KEY')

# Register website pages
site = Website(app)
for route, route_info in site.routes.items():
    endpoint = "site_" + route.replace("/", "_").strip("_")
    if not endpoint:
        endpoint = "site_root"
    app.add_url_rule(
        route,
        endpoint=endpoint,
        view_func=route_info['function'],
        methods=route_info['methods'],
    )

# Register backend API endpoints
backend_api = Backend_Api(app, config)
for route, route_info in backend_api.routes.items():
    endpoint = "backend_" + route.replace("/", "_").replace("<", "").replace(">", "").strip("_")
    app.add_url_rule(
        route,
        endpoint=endpoint,
        view_func=route_info['function'],
        methods=route_info['methods'],
    )

# Expose WSGI application for Vercel
app_handler = app
