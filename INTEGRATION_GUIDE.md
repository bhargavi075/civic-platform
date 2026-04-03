# 🚀 CivicAI Chatbot Upgrade — Integration Guide

## Files Delivered

| File | Destination in your project |
|---|---|
| `Chat.js` | `backend/models/Chat.js` |
| `chat_routes.js` | `backend/routes/chat.js` |
| `api.js` | `frontend/src/utils/api.js` (full replacement) |
| `Chatbot.jsx` | `frontend/src/components/Chatbot.jsx` (full replacement) |
| `server_snippet.js` | Reference — 2 lines to add to `backend/server.js` |

---

## Step 1 — Backend: Add the Chat Model

Copy `Chat.js` to `backend/models/Chat.js`.

```bash
cp Chat.js your-project/backend/models/Chat.js
```

This creates a MongoDB collection with:
- `userId` — ObjectId reference to the User
- `role` — citizen / officer / admin
- `title` — auto-generated from first user message
- `messages[]` — array of `{ sender, text, timestamp }`
- `lastMessageAt` — updated on every save

---

## Step 2 — Backend: Add the Chat Routes

Copy `chat_routes.js` to `backend/routes/chat.js`.

```bash
cp chat_routes.js your-project/backend/routes/chat.js
```

### API endpoints created:

| Method | Path | Description |
|---|---|---|
| GET | `/api/chat` | List all chats for current user (no messages) |
| GET | `/api/chat/:id` | Get one chat with all messages |
| POST | `/api/chat` | Create new empty chat session |
| POST | `/api/chat/:id/messages` | Append a message to a chat |
| PATCH | `/api/chat/:id/title` | Rename a chat |
| DELETE | `/api/chat/:id` | Delete a chat permanently |

---

## Step 3 — Backend: Register the Route in server.js

Open `backend/server.js` and add **2 lines**:

```js
// Near the top, with other require() statements:
const chatRoutes = require('./routes/chat');

// Near the bottom, with other app.use() statements:
app.use('/api/chat', chatRoutes);
```

That's it for the backend.

---

## Step 4 — Frontend: Replace api.js

Replace `frontend/src/utils/api.js` with the provided `api.js`.

All existing endpoints are preserved. New chat endpoints added:

```js
api.getChats()                          // GET  /api/chat
api.getChat(chatId)                     // GET  /api/chat/:id
api.createChat()                        // POST /api/chat
api.sendMessage(chatId, { sender, text }) // POST /api/chat/:id/messages
api.renameChat(chatId, title)           // PATCH /api/chat/:id/title
api.deleteChat(chatId)                  // DELETE /api/chat/:id
```

---

## Step 5 — Frontend: Replace Chatbot.jsx

Replace `frontend/src/components/Chatbot.jsx` with the provided `Chatbot.jsx`.

### ✅ What's new vs the original:

| Feature | Status |
|---|---|
| Multi-session chat history | ✅ |
| Left sidebar with chat list | ✅ |
| Active chat highlighted | ✅ |
| Click to load past chat | ✅ |
| Delete chat (DB + UI) | ✅ |
| Refresh chat (new session, DB kept) | ✅ |
| Role-based separation | ✅ auto (uses `user.role` from AuthContext) |
| userId-based separation | ✅ auto (uses `user._id` from AuthContext) |
| Timestamps on every message | ✅ |
| Persistent storage (MongoDB) | ✅ |
| Route change auto-reload | ✅ via `useLocation()` |
| Responsive two-panel layout | ✅ |
| Sidebar toggle button | ✅ |

---

## Step 6 — Verify AuthContext passes `user`

The new Chatbot imports `useAuth` from `../context/AuthContext`. It uses:
- `user._id` — for userId-based chat storage
- `user.role` — for role-based separation
- `user.name` — for the welcome message

Your existing `AuthContext.jsx` already provides all three. ✅ No changes needed.

---

## Step 7 — Verify React Router is installed

The Chatbot uses `useLocation` from `react-router-dom`.
Your project already uses React Router (`App.jsx`). ✅ No additional installation needed.

---

## Step 8 — Restart servers

```bash
# Backend
cd backend && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev
```

---

## Behavior Summary

| Action | What happens |
|---|---|
| Open chat | Loads all previous chats from MongoDB; opens latest |
| Send message | Saves user msg → generates bot response → saves bot msg |
| Click sidebar chat | Loads that chat's messages |
| 🔄 Refresh button | Clears UI, creates new empty chat in DB |
| 🗑️ Delete button | Removes from MongoDB and sidebar |
| Page refresh | All chats restored from MongoDB |
| Route navigation | Chat list reloads for current user/role |
| Login as different role | Only sees that role's chats |

---

## Troubleshooting

**Chats not loading?**
- Check the backend console for errors
- Confirm the JWT token is present in `Authorization` header
- Ensure MongoDB is running and `MONGODB_URI` is set in `.env`

**"User not found" error?**
- The chat routes use `authenticate` middleware — user must be logged in
- If testing unauthenticated, the chatbot falls back to a local session gracefully

**Sidebar not showing?**
- Toggle the ☰ hamburger icon in the chat header
- On small screens, close width may hide the sidebar; use the toggle

**Chat title not updating?**
- Title auto-generates from the first user message sent
- It updates in the sidebar after the server responds
