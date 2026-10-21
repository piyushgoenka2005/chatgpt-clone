import os
from flask import render_template, send_file, redirect, session
from time import time
from os import urandom

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CLIENT_DIR = os.path.join(BASE_DIR, "client")
if not os.path.exists(CLIENT_DIR):
    CLIENT_DIR = os.path.join(os.getcwd(), "client")


class Website:
    def __init__(self, app) -> None:
        self.app = app
        self.routes = {
            '/': {
                'function': lambda: redirect('/chat/'),
                'methods': ['GET']
            },
            '/login': {
                'function': self._login,
                'methods': ['GET']
            },
            '/register': {
                'function': self._register,
                'methods': ['GET']
            },
            '/chat/': {
                'function': self._index,
                'methods': ['GET']
            },
            '/chat/<conversation_id>': {
                'function': self._chat,
                'methods': ['GET']
            },
            '/assets/<folder>/<file>': {
                'function': self._assets,
                'methods': ['GET']
            }
        }

    def _login(self):
        if 'user_id' in session:
            return redirect('/chat/')
        return render_template('auth.html', mode='login')

    def _register(self):
        if 'user_id' in session:
            return redirect('/chat/')
        return render_template('auth.html', mode='register')

    def _chat(self, conversation_id):
        if 'user_id' not in session:
            return redirect('/login')

        if '-' not in conversation_id:
            return redirect('/chat/')

        user_email = session.get('user_email', '')
        user_name = session.get('user_name') or (user_email.split('@')[0] if '@' in user_email else 'User')
        return render_template('index.html', chat_id=conversation_id, user_email=user_email, user_name=user_name)

    def _index(self):
        if 'user_id' not in session:
            return redirect('/login')

        chat_id = f'{urandom(4).hex()}-{urandom(2).hex()}-{urandom(2).hex()}-{urandom(2).hex()}-{hex(int(time() * 1000))[2:]}'
        user_email = session.get('user_email', '')
        user_name = session.get('user_name') or (user_email.split('@')[0] if '@' in user_email else 'User')
        return render_template('index.html', chat_id=chat_id, user_email=user_email, user_name=user_name)

    def _assets(self, folder: str, file: str):
        try:
            asset_path = os.path.join(CLIENT_DIR, folder, file)
            if os.path.isfile(asset_path):
                return send_file(asset_path, as_attachment=False)
            return "File not found", 404
        except Exception:
            return "File not found", 404
