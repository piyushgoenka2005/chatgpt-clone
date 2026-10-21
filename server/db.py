from pymongo import MongoClient, ASCENDING, DESCENDING
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import re

# Indian Standard Time (UTC+05:30)
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now_str():
    """Return sortable explicit IST timestamp string: 'YYYY-MM-DD HH:MM:SS IST'"""
    return datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST")


class Database:
    def __init__(self, uri: str, db_name: str = "chatgpt_clone"):
        self.client = MongoClient(uri, serverSelectionTimeoutMS=8000)
        self.db = self.client[db_name]
        self.users = self.db["users"]
        self.conversations = self.db["conversations"]
        
        try:
            self.users.create_index([("email", ASCENDING)], unique=True)
            self.conversations.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
            self.conversations.create_index([("conversation_id", ASCENDING)])
        except Exception as e:
            print("Notice on Mongo indexes:", e)

    def register_user(self, name: str, email: str, password: str):
        email = email.strip().lower()
        name = (name or "").strip()
        if not name:
            name = email.split("@")[0] if "@" in email else "User"

        if not email or not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
            return False, "Please provide a valid email address."
        if not password or len(password) < 6:
            return False, "Password must be at least 6 characters long."
        
        existing = self.users.find_one({"email": email})
        if existing:
            return False, "An account with this email already exists."
        
        now_ist = get_ist_now_str()
        user_doc = {
            "name": name,
            "email": email,
            "password": generate_password_hash(password),
            "created_at": now_ist
        }
        res = self.users.insert_one(user_doc)
        return True, {"user_id": str(res.inserted_id), "email": email, "name": name}

    def authenticate_user(self, email: str, password: str):
        email = email.strip().lower()
        user = self.users.find_one({"email": email})
        if not user:
            return False, "Invalid email or password."
        if not check_password_hash(user["password"], password):
            return False, "Invalid email or password."
        name = user.get("name") or (user["email"].split("@")[0] if "@" in user["email"] else "User")
        return True, {"user_id": str(user["_id"]), "email": user["email"], "name": name}

    def get_user_by_id(self, user_id: str):
        try:
            user = self.users.find_one({"_id": ObjectId(user_id)})
            if user:
                name = user.get("name") or (user["email"].split("@")[0] if "@" in user["email"] else "User")
                return {"user_id": str(user["_id"]), "email": user["email"], "name": name}
        except Exception:
            pass
        return None

    def get_conversations(self, user_id: str, limit: int = 50):
        docs = self.conversations.find(
            {"user_id": str(user_id)},
            {"_id": 0, "conversation_id": 1, "title": 1, "updated_at": 1}
        ).sort("updated_at", DESCENDING).limit(limit)
        
        results = []
        for d in docs:
            results.append({
                "id": d["conversation_id"],
                "title": d.get("title", "New Conversation"),
                "updated_at": str(d.get("updated_at", get_ist_now_str()))
            })
        return results

    def get_conversation(self, user_id: str, conversation_id: str):
        doc = self.conversations.find_one({
            "user_id": str(user_id),
            "conversation_id": conversation_id
        }, {"_id": 0})
        return doc

    def save_conversation(self, user_id: str, conversation_id: str, title: str, items: list):
        now_ist = get_ist_now_str()
        self.conversations.update_one(
            {"user_id": str(user_id), "conversation_id": conversation_id},
            {
                "$set": {
                    "title": title[:40] if title else "New Conversation",
                    "items": items,
                    "updated_at": now_ist
                },
                "$setOnInsert": {
                    "created_at": now_ist
                }
            },
            upsert=True
        )

    def append_message(self, user_id: str, conversation_id: str, role: str, content: str, default_title: str = None, image: str = None, document: dict = None):
        now_ist = get_ist_now_str()
        msg = {
            "role": role,
            "content": content,
            "created_at": now_ist
        }
        if image:
            msg["image"] = image
        if document:
            msg["document"] = document
        
        # Check if conversation exists
        conv_clean_id = str(conversation_id).strip()
        existing = self.conversations.find_one({"user_id": str(user_id), "conversation_id": conv_clean_id})
        if not existing:
            doc_title = f"Doc: {document.get('name')}" if document and document.get('name') else None
            title = default_title or (content[:35] + "..." if len(content) > 35 else (content if content else (doc_title or "New Conversation"))) or "New Conversation"
            self.conversations.insert_one({
                "user_id": str(user_id),
                "conversation_id": conv_clean_id,
                "title": title,
                "items": [msg],
                "created_at": now_ist,
                "updated_at": now_ist
            })
        else:
            self.conversations.update_one(
                {"user_id": str(user_id), "conversation_id": conv_clean_id},
                {
                    "$push": {"items": msg},
                    "$set": {
                        "updated_at": now_ist
                    }
                }
            )

    def delete_conversation(self, user_id: str, conversation_id: str):
        result = self.conversations.delete_one({
            "user_id": str(user_id),
            "conversation_id": str(conversation_id).strip()
        })
        return result.deleted_count > 0

    def delete_message(self, user_id: str, conversation_id: str, message_index: int):
        conv = self.get_conversation(user_id, conversation_id)
        if not conv or "items" not in conv:
            return False
        items = conv["items"]
        if 0 <= message_index < len(items):
            items.pop(message_index)
            now_ist = get_ist_now_str()
            self.conversations.update_one(
                {"user_id": str(user_id), "conversation_id": str(conversation_id).strip()},
                {"$set": {"items": items, "updated_at": now_ist}}
            )
            return True
        return False

    def delete_all_conversations(self, user_id: str):
        self.conversations.delete_many({"user_id": str(user_id)})
