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
```
