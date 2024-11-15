# Web Messenger

### Web Messenger Overview
[![Overview](https://img.youtube.com/vi/4cagPevfH8w/0.jpg)](https://youtu.be/4cagPevfH8w)

## About
I created this messenger using Next.js for frontend and Python for backend.

## Installation
You need Python, Node.js and PostgreSQL installed. I used `Python 3.12.3`, `Node.js 18.19.1` and `PostgreSQL 16.4`. OS: **Ubuntu**.<br>
You need `npm` and `poetry` installed also.

Poetry installation:
```
sudo apt install pipx
pipx install poetry
```
NPM installation:
```
sudo apt install npm
```

### Creating database tables
First of all you must create the database itself and connect to it.
```
CREATE DATABASE messenger;
\c messenger;
```
Now you can create the tables.
```
CREATE TABLE users (id SERIAL PRIMARY KEY, login VARCHAR(20), password TEXT, name VARCHAR(25) DEFAULT 'User');
CREATE TABLE messages (id SERIAL PRIMARY KEY, sender_id INT, receiver_id INT, message TEXT);
CREATE TABLE chats (id SERIAL PRIMARY KEY, starter_user_id INT, target_user_id INT);
CREATE TABLE active_sessions (id SERIAL PRIMARY KEY, user_id INT, session_token VARCHAR(32));
```

### Installing python packages
```
cd messenger.backend
poetry install
```

### Installing Node.js packages
```
cd messenger.frontend
npm install
```

## Backend configuration
The configuration file for the backend is stored in `messenger.backend/messenger`. Change the PostgreSQL database configuration (database name, user name, etc).

## Execution
### To run both the backend and frontend you need to open two terminals.

Running FastAPI.
```
cd messenger.backend
poetry shell
poetry run fastapi run messenger/app.py
```

Running Next.js project.
```
cd messenger.frontend
npm run dev
```
