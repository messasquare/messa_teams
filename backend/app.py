import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from bson import ObjectId
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room, emit
from pymongo import MongoClient, DESCENDING
import jwt
import bcrypt
import cloudinary
import cloudinary.uploader

# --- Config ---
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/messa_teams")
MONGO_DB_NAME = os.environ.get("MONGO_DB", "messa_teams")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-messa-square-secret")
JWT_EXP_DAYS = 14
FRONTEND_URL = os.environ.get("FRONTEND_URL", "*")

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
    secure=True
)

app = Flask(__name__)
app.config['SECRET_KEY'] = JWT_SECRET
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]

# Collections
users_col = db.users
groups_col = db.groups
messages_col = db.messages
tasks_col = db.tasks
meetings_col = db.meetings
announcements_col = db.announcements

# Indexes
try:
    users_col.create_index("email", unique=True)
    messages_col.create_index([("conversation_id", 1), ("created_at", -1)])
    tasks_col.create_index("assignee_ids")
except Exception:
    pass

ROLES = ["founder", "cofounder", "core", "volunteer"]
ROLE_LABEL = {"founder":"Founder","cofounder":"Co-Founder","core":"Core-Team","volunteer":"Volunteer"}

def serialize_doc(d):
    if not d: return d
    d["_id"] = str(d["_id"])
    for k in list(d.keys()):
        if isinstance(d[k], ObjectId):
            d[k] = str(d[k])
        if isinstance(d[k], datetime):
            d[k] = d[k].isoformat()
    return d

def hash_pw(pw): return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
def check_pw(pw, h): return bcrypt.checkpw(pw.encode(), h.encode())

def make_token(user):
    payload = {
        "uid": str(user["_id"]),
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else None
        if not token:
            return jsonify({"error": "unauthorized"}), 401
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user = users_col.find_one({"_id": ObjectId(data["uid"])})
            if not user or user.get("status") != "approved":
                return jsonify({"error": "unauthorized"}), 401
            request.user = user
            request.user_id = str(user["_id"])
        except Exception:
            return jsonify({"error": "unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper

def require_roles(*roles):
    def deco(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if request.user["role"] not in roles:
                return jsonify({"error": "forbidden"}), 403
            return f(*args, **kwargs)
        return wrapper
    return deco

def is_admin(user):
    return user["role"] in ("founder", "cofounder")

# --- Auth ---
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json or {}
    name = data.get("name","").strip()
    email = data.get("email","").strip().lower()
    password = data.get("password","")
    role = data.get("role","volunteer")
    if role not in ROLES: role = "volunteer"
    if not name or not email or len(password) < 6:
        return jsonify({"error": "invalid input"}), 400
    if users_col.find_one({"email": email}):
        return jsonify({"error": "email already registered"}), 400
    # First ever approved founder auto-approves
    existing_admin = users_col.find_one({"role": {"$in": ["founder","cofounder"]}, "status": "approved"})
    status = "approved" if not existing_admin and role in ("founder","cofounder") else "pending"
    user = {
        "name": name, "email": email,
        "password_hash": hash_pw(password),
        "role": role,
        "status": status,
        "bio": "",
        "avatar_url": "",
        "permissions": {"allowed_group_ids": [], "can_dm_founders": False},
        "created_at": datetime.now(timezone.utc)
    }
    res = users_col.insert_one(user)
    user["_id"] = res.inserted_id
    if status == "approved":
        token = make_token(user)
        return jsonify({"token": token, "user": serialize_doc({k:v for k,v in user.items() if k!="password_hash"})})
    return jsonify({"pending": True, "message": "Account pending founder approval"}), 202

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email","").lower()
    password = data.get("password","")
    user = users_col.find_one({"email": email})
    if not user or not check_pw(password, user["password_hash"]):
        return jsonify({"error": "invalid credentials"}), 401
    if user.get("status") != "approved":
        return jsonify({"pending": True, "message": "Account pending approval"}), 403
    token = make_token(user)
    user_out = {k:v for k,v in user.items() if k != "password_hash"}
    return jsonify({"token": token, "user": serialize_doc(user_out)})

@app.route("/api/auth/me", methods=["GET"])
@auth_required
def me():
    u = {k:v for k,v in request.user.items() if k != "password_hash"}
    return jsonify(serialize_doc(u))

# --- Admin / Users ---
@app.route("/api/admin/pending_users", methods=["GET"])
@auth_required
@require_roles("founder","cofounder")
def pending_users():
    users = list(users_col.find({"status": "pending"}).sort("created_at", DESCENDING))
    for u in users: u.pop("password_hash", None)
    return jsonify([serialize_doc(u) for u in users])

@app.route("/api/admin/users", methods=["GET"])
@auth_required
@require_roles("founder","cofounder","core")
def list_users():
    q = request.args.get("q","")
    filt = {}
    if q:
        filt = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]}
    users = list(users_col.find(filt, {"password_hash": 0}).sort("created_at", DESCENDING).limit(200))
    return jsonify([serialize_doc(u) for u in users])

@app.route("/api/admin/approve_user", methods=["POST"])
@auth_required
@require_roles("founder","cofounder")
def approve_user():
    data = request.json or {}
    uid = data.get("user_id")
    role = data.get("role")
    try:
        update = {"status": "approved"}
        if role in ROLES:
            update["role"] = role
        users_col.update_one({"_id": ObjectId(uid)}, {"$set": update})
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/admin/update_permissions", methods=["POST"])
@auth_required
@require_roles("founder","cofounder")
def update_permissions():
    data = request.json or {}
    uid = data.get("user_id")
    perms = data.get("permissions", {})
    # expected: {"allowed_group_ids": [...], "can_dm_founders": bool}
    users_col.update_one({"_id": ObjectId(uid)}, {"$set": {"permissions": perms}})
    return jsonify({"ok": True})

@app.route("/api/admin/remove_user", methods=["POST"])
@auth_required
@require_roles("founder","cofounder")
def remove_user():
    uid = request.json.get("user_id")
    users_col.delete_one({"_id": ObjectId(uid)})
    return jsonify({"ok": True})

# --- Groups ---
@app.route("/api/groups", methods=["GET"])
@auth_required
def get_groups():
    u = request.user
    if is_admin(u):
        groups = list(groups_col.find().sort("created_at", DESCENDING))
    else:
        allowed = u.get("permissions", {}).get("allowed_group_ids", [])
        groups = list(groups_col.find({"_id": {"$in": [ObjectId(x) for x in allowed if ObjectId.is_valid(x)]}}))
    return jsonify([serialize_doc(g) for g in groups])

@app.route("/api/groups", methods=["POST"])
@auth_required
@require_roles("founder","cofounder")
def create_group():
    data = request.json or {}
    name = data.get("name","").strip()
    description = data.get("description","")
    member_ids = data.get("member_ids", [])
    if not name: return jsonify({"error": "name required"}), 400
    g = {
        "name": name,
        "description": description,
        "member_ids": member_ids,
        "created_by": request.user_id,
        "created_at": datetime.now(timezone.utc)
    }
    res = groups_col.insert_one(g)
    g["_id"] = res.inserted_id
    return jsonify(serialize_doc(g)), 201

# --- Chat / Messages ---
def conversation_id_for(group_id=None, user_ids=None):
    if group_id: return f"group:{group_id}"
    if user_ids:
        u = sorted(user_ids)
        return f"dm:{u[0]}:{u[1]}"
    return None

def can_access_conversation(user, conversation_id):
    if conversation_id.startswith("group:"):
        gid = conversation_id.split(":",1)[1]
        if is_admin(user): return True
        allowed = user.get("permissions", {}).get("allowed_group_ids", [])
        return gid in allowed
    if conversation_id.startswith("dm:"):
        _, a, b = conversation_id.split(":")
        uid = str(user["_id"])
        if uid not in (a,b): return False
        # volunteer -> founder DM check
        other_id = b if uid == a else a
        other = users_col.find_one({"_id": ObjectId(other_id)})
        if other and other["role"] in ("founder","cofounder") and user["role"] == "volunteer":
            if not user.get("permissions", {}).get("can_dm_founders", False):
                return False
        return True
    return False

@app.route("/api/chat/messages", methods=["GET"])
@auth_required
def get_messages():
    conversation_id = request.args.get("conversation_id")
    if not conversation_id or not can_access_conversation(request.user, conversation_id):
        return jsonify({"error":"forbidden"}), 403
    msgs = list(messages_col.find({"conversation_id": conversation_id}).sort("created_at", DESCENDING).limit(100))
    msgs.reverse()
    return jsonify([serialize_doc(m) for m in msgs])

@app.route("/api/chat/send", methods=["POST"])
@auth_required
def send_message():
    data = request.json or {}
    conversation_id = data.get("conversation_id")
    text = data.get("text","")
    attachments = data.get("attachments", [])
    location = data.get("location")  # {lat, lng, url}
    msg_type = data.get("type", "text")
    if not conversation_id or not can_access_conversation(request.user, conversation_id):
        return jsonify({"error":"forbidden"}), 403
    msg = {
        "conversation_id": conversation_id,
        "sender_id": request.user_id,
        "sender_name": request.user["name"],
        "sender_role": request.user["role"],
        "text": text,
        "type": msg_type,
        "attachments": attachments,
        "location": location,
        "created_at": datetime.now(timezone.utc)
    }
    res = messages_col.insert_one(msg)
    msg["_id"] = res.inserted_id
    out = serialize_doc(msg)
    socketio.emit("message:new", out, to=conversation_id)
    return jsonify(out), 201

# --- Upload (Cloudinary) ---
@app.route("/api/upload", methods=["POST"])
@auth_required
def upload():
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    f = request.files["file"]
    try:
        result = cloudinary.uploader.upload(f, folder="messa_teams", resource_type="auto")
        return jsonify({
            "url": result.get("secure_url"),
            "type": result.get("resource_type"),
            "name": f.filename,
            "bytes": result.get("bytes")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Tasks ---
@app.route("/api/tasks", methods=["GET"])
@auth_required
def list_tasks():
    u = request.user
    if is_admin(u) or u["role"] == "core":
        filt = {}
    else:
        filt = {"assignee_ids": str(u["_id"])}
    tasks = list(tasks_col.find(filt).sort("created_at", DESCENDING))
    return jsonify([serialize_doc(t) for t in tasks])

@app.route("/api/tasks", methods=["POST"])
@auth_required
@require_roles("founder","cofounder","core")
def create_task():
    data = request.json or {}
    task = {
        "title": data.get("title",""),
        "description": data.get("description",""),
        "assignee_ids": data.get("assignee_ids", []),
        "priority": data.get("priority","medium"),
        "status": "todo",
        "created_by": request.user_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    res = tasks_col.insert_one(task)
    task["_id"] = res.inserted_id
    return jsonify(serialize_doc(task)), 201

@app.route("/api/tasks/<task_id>/status", methods=["POST"])
@auth_required
def update_task_status(task_id):
    data = request.json or {}
    status = data.get("status")
    if status not in ("todo","in_progress","review","done"):
        return jsonify({"error":"invalid status"}), 400
    task = tasks_col.find_one({"_id": ObjectId(task_id)})
    if not task: return jsonify({"error":"not found"}), 404
    # assignee, core, or admin can update
    uid = request.user_id
    if not (is_admin(request.user) or request.user["role"]=="core" or uid in task.get("assignee_ids", [])):
        return jsonify({"error":"forbidden"}), 403
    tasks_col.update_one({"_id": ObjectId(task_id)}, {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}})
    return jsonify({"ok": True})

# --- Meetings ---
@app.route("/api/meetings", methods=["GET"])
@auth_required
def list_meetings():
    meetings = list(meetings_col.find().sort("starts_at", DESCENDING).limit(100))
    return jsonify([serialize_doc(m) for m in meetings])

@app.route("/api/meetings", methods=["POST"])
@auth_required
@require_roles("founder","cofounder","core")
def create_meeting():
    data = request.json or {}
    title = data.get("title","Meeting")
    starts_at = data.get("starts_at")
    allowed_roles = data.get("allowed_roles", ROLES)
    room_name = f"MessaTeams-{ObjectId()}"
    meeting = {
        "title": title,
        "description": data.get("description",""),
        "starts_at": starts_at,
        "allowed_roles": allowed_roles,
        "room_name": room_name,
        "jitsi_url": f"https://meet.jit.si/{room_name}",
        "created_by": request.user_id,
        "created_at": datetime.now(timezone.utc)
    }
    res = meetings_col.insert_one(meeting)
    meeting["_id"] = res.inserted_id
    return jsonify(serialize_doc(meeting)), 201

# --- Announcements ---
@app.route("/api/announcements", methods=["GET"])
@auth_required
def list_announcements():
    anns = list(announcements_col.find().sort("created_at", DESCENDING).limit(50))
    return jsonify([serialize_doc(a) for a in anns])

@app.route("/api/announcements", methods=["POST"])
@auth_required
@require_roles("founder","cofounder","core")
def create_announcement():
    data = request.json or {}
    ann = {
        "title": data.get("title",""),
        "body": data.get("body",""),
        "pinned": bool(data.get("pinned", False)),
        "created_by": request.user_id,
        "author_name": request.user["name"],
        "created_at": datetime.now(timezone.utc)
    }
    res = announcements_col.insert_one(ann)
    ann["_id"] = res.inserted_id
    return jsonify(serialize_doc(ann)), 201

# --- Socket.IO Chat ---
@socketio.on("join")
def on_join(data):
    conversation_id = data.get("conversation_id")
    # simple join, access already checked via REST
    if conversation_id:
        join_room(conversation_id)
        emit("joined", {"room": conversation_id})

@socketio.on("leave")
def on_leave(data):
    leave_room(data.get("conversation_id", ""))

@socketio.on("typing")
def on_typing(data):
    emit("typing", data, to=data.get("conversation_id"), include_self=False)

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "messa_teams", "time": datetime.now(timezone.utc).isoformat()})

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
