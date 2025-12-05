# WhisperCloud - Distributed System Simulator

A simulation of a distributed system that enables users to subscribe to topics of interest and consequently, receive updates about those topics and from the system admin.

---

## Prerequisites

- Node.js v18+
- MongoDB v5.1.0+

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/aboodnjtv/WhisperCloud.git
cd WhisperCloud/backend
npm install
```

### 2. Configure Environment
Create `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/whispercloud
SESSION_SECRET=your_secret_key_here
PORT=3000
```

### 3. Start MongoDB
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### 4. Seed Database
```bash
# From backend directory
node seed/userSeeder.js
node seed/pageSeeder.js
```

### 5. Run Application
```bash
# From backend directory
node app.js
# or with auto-reload
nodemon app.js
```

Access at `http://localhost:3000`

---

## Default Login Credentials

**Admins:** `admin1@whispercloud.com` through `admin3@whispercloud.com`  
**Peers:** `peer1@whispercloud.com` through `peer9@whispercloud.com`  
**Password (all accounts):** `a`

## Tech Stack

**Backend:** Node.js, Express.js, MongoDB, Mongoose, bcrypt, express-session  
**Frontend:** EJS templates, Vanilla JavaScript, CSS3  
**External APIs:** Hacker News, CoinGecko, Weather.gov, Useless Facts API

---

## Project Structure
```
WhisperCloud/
├── backend/
│   ├── models/       # User, Page, Message schemas
│   ├── routes/       # API endpoints (gossip, user, page, message)
│   ├── services/     # API fetcher for external sources
│   ├── seed/         # Database seeders
│   └── app.js        # Main server
└── frontend/
    ├── public/       # CSS and client-side JS (gossip, leader election)
    └── views/        # EJS templates
```

---

## Team

Abdel Rahman Alnajjar, Mansi Patel, Anushka

---
