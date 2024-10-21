from fastapi import FastAPI, WebSocket, Response, Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from pydantic_models import User, SessionToken
from helpers import chat_sockets, dialogue_sockets, \
                    check_login, check_password, create_user, auth_user, get_session_token, check_session
from json import loads
from network import message_handler
import asyncpg

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = await asyncpg.create_pool(
        user = 'postgres',
        password = 'postgres',
        database = 'messenger',
        host = '127.0.0.1',
        port = 5432,
        min_size = 1,
        max_size = 50,
    )
    yield
    pool.close()

app = FastAPI(lifespan = lifespan)
pool: asyncpg.Pool
origins = [
    'localhost',
    'http://localhost',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

app.add_middleware(
    CORSMiddleware, 
    allow_origins = origins,
    allow_credentials = True, 
    allow_methods = ['*'],
    allow_headers = ['*'],
)   

@app.post('/login')
async def login(user: User, response: Response, request: Request) -> dict:
    login_incorrect = await check_login(user.login)
    if login_incorrect: return { 'error': login_incorrect }

    password_incorrect = await check_password(user.password)
    if password_incorrect: return { 'error': password_incorrect }
    
    user_exists = False
    async with pool.acquire() as conn:
        database_user = await conn.fetchrow('SELECT password FROM users WHERE users.login = $1', user.login)
        if database_user: user_exists = True

        if user_exists: 
            auth_failure = await auth_user(conn, user.password, database_user['password'])
            if auth_failure: return { 'error': auth_failure }
        else: 
            creation_failure = await create_user(conn, user)
            if creation_failure: return { 'error': creation_failure }

        user_id = await conn.fetchrow('SELECT id FROM users WHERE login = $1', user.login)
        session_token = await get_session_token(conn, user_id['id'])  
    
    return { 'error': '', 'load': session_token }

@app.post('/verify-session')
async def verify_session(session_token: SessionToken, request: Request) -> dict:
    async with pool.acquire() as conn:
        exists = await check_session(conn, session_token.session_token)
        if exists:
            return { 'error': '' }
        else:
            return { 'error': 'Current session is invalid. Please log in again.'}

@app.websocket('/ws/messenger/information')
async def messenger_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    user_id = [None]
    while True:
        raw_command = await websocket.receive_text()
        command = loads(raw_command)
        async with pool.acquire() as conn:
            if not await message_handler(conn, command, websocket, user_id):
                break

@app.websocket('/ws/messenger/chatlist')
async def messenger_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    user_id = [None]
    while True:
        raw_command = await websocket.receive_text()
        command = loads(raw_command)
        async with pool.acquire() as conn:
            if not await message_handler(conn, command, websocket, user_id, chat_sockets):
                break

@app.websocket('/ws/messenger/dialogue')
async def messenger_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    user_id = [None]
    while True:
        raw_command = await websocket.receive_text()
        command = loads(raw_command)
        async with pool.acquire() as conn:
            if not await message_handler(conn, command, websocket, user_id, dialogue_sockets):
                break
        