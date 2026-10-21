import os
import sys

# Ensure repository root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from api.index import app, config

if __name__ == '__main__':
    site_config = config.get('site_config', {'host': '0.0.0.0', 'port': 1338, 'debug': False})
    port = int(os.getenv('PORT', site_config.get('port', 1338)))
    host = site_config.get('host', '0.0.0.0')
    debug = site_config.get('debug', False)

    print(f"Running on http://127.0.0.1:{port} (host: {host})")
    app.run(host=host, port=port, debug=debug)
