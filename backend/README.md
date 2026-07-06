# MESSA TEAMS

WhatsApp-style team platform for MESSA SQUARE.

Roles: Founder / Co-Founder / Core-Team / Volunteer

Features
1. WhatsApp-style chat — Group + 1:1 DM, read in real-time via Socket.IO
2. Jitsi calling — Meetings scheduled in-app, Join opens meet.jit.si
3. Teams-style Hub — Tasks Kanban, Announcements feed, Meetings calendar
4. Location sharing — Google Maps link + live GPS share in chat
5. Voice / Video notes — Cloudinary upload, play inline in chat
6. Task Tracer — Todo / In Progress / Review / Done, assignees update status
7. File sharing — Any file type via Cloudinary, images/video/audio preview inline

Stack
- Backend: Flask 3 + Flask-SocketIO + PyMongo — Render.com
- Frontend: React 18 + Vite + Tailwind CSS — Vercel
- DB: MongoDB Atlas
- Storage: Cloudinary
- Realtime: Socket.IO
- Calls: Jitsi Meet External API

---
## Local run

Backend:
```
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill MONGO_URI, JWT_SECRET, CLOUDINARY_*
python app.py
# http://localhost:5000
```

Frontend:
```
cd frontend
npm install
# create .env : VITE_API_URL=http://localhost:5000
npm run dev
# http://localhost:5173
```

First registered Founder/Co-Founder is auto-approved. All other accounts go to Pending → approve in Admin dashboard.

## Deploy

Backend → Render.com
- Build: `pip install -r requirements.txt`
- Start: `gunicorn -k eventlet -w 1 app:app`
- Env: MONGO_URI, JWT_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, FRONTEND_URL

Frontend → Vercel
- Root: `frontend`
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://your-render-backend.onrender.com`

## Roles & Permissions

Founder / Co-Founder:
- Full admin dashboard
- Approve users, set roles
- Create groups, assign members
- Per-user permissions: allowed_group_ids[], can_dm_founders
- Create announcements, meetings, tasks
- Task tracer full view

Core-Team:
- Create tasks / announcements / meetings
- Update any task status

Volunteer:
- Chat in assigned groups only
- DM Core-Team freely, DM Founders only if `can_dm_founders=true`
- Update status on assigned tasks

Groups are Founder/Co-Founder created only. Chat = Option B — Groups + DMs.

## API
POST /api/auth/register, /api/auth/login
GET  /api/auth/me
GET  /api/admin/pending_users, POST /api/admin/approve_user, /api/admin/update_permissions
GET/POST /api/groups
GET  /api/chat/messages?conversation_id=group:xxx | dm:a:b
POST /api/chat/send
POST /api/upload  (Cloudinary)
GET/POST /api/tasks, POST /api/tasks/:id/status
GET/POST /api/meetings
GET/POST /api/announcements

Socket.IO: join, leave, typing, message:new

---
MESSA SQUARE — Messa Red #D72A2A
