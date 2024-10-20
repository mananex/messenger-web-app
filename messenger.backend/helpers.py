from string import ascii_letters
from asyncpg.pool import PoolAcquireContext
from asyncpg import Record
from aiobcrypt import gensalt, hashpw, checkpw
from pydantic_models import User
from secrets import token_hex
from asyncpg.connection import Connection
from fastapi import WebSocket
from typing import Dict

chat_sockets: Dict[int, WebSocket] = {}
dialogue_sockets: Dict[int, WebSocket] = {}

numbers = '123456789'
allowed_login_symbols = ascii_letters + numbers + '_'
password_special_symbols = '!@#$%^&*()'

async def check_login(login: str) -> str:
    '''
    Checks validity of the login. Returns empty string if the login is valid, otherwise - an error message.
    '''
    if len(login) <= 3: return 'The login must contain more than 3 letters.'
    elif len(login) >= 21: return 'The login must contain no more than 21 letters.'

    for letter in login:
        if letter not in allowed_login_symbols:
            return 'The login must contain only english letters, numbers and _'
        
    return ''

async def check_name(name: str) -> str:
    '''
    Checks validity of the user name. Returns empty string if the name is valid, otherwise - an error message.
    '''
    if len(name) <= 2: return 'The name must contain more than 2 letters.'
    elif len(name) >= 19: return 'The name should be no longer than 18 letters.'
    return ''

async def check_password(password: str) -> str:
    '''
    Checks validity of the password. Returns empty string if the password is valid, otherwise - an error message.
    '''
    if len(password) <= 6: return 'The password must contain more than 6 letters.'

    has_numbers = False
    has_letters = False
    has_specials = False

    for letter in password:
        if letter in numbers: has_numbers = True
        if letter in ascii_letters: has_letters = True 
        if letter in password_special_symbols: has_specials = True
        if has_numbers and has_letters and has_specials: return ''

    return 'The password must contain at least one number, one letter and one of these symbols: ' + ', '.join(password_special_symbols)

async def check_ID(id: int) -> str:
    '''
    Checks validity of the ID. Return empty string if the ID is valid, otherwise - an error message.
    '''
    try:
        int(id)
        return ''
    except Exception:
        return 'The ID can\'t contain anything but numbers.'

async def create_user(conn: PoolAcquireContext, user: User) -> str:
    '''
    Creates a new user. Returns empty string if everything was fine, otherwise - a string with an error.
    '''
    try:
        hashed_password_string = await hashpw(user.password.encode(), await gensalt())
        await conn.execute('INSERT INTO users (login, password) VALUES ($1, $2)', user.login.strip(), hashed_password_string.decode())
        return ''
    except Exception:
        return 'An error was occured while creating your account'
    
async def auth_user(conn: PoolAcquireContext, user_password: str, database_password: str) -> bool:
    '''
    Authenticates the user. Returns empty string if user password is equal to the password stored in database, otherwise - a string with an error.
    '''
    if not await checkpw(user_password.encode(), database_password.encode()): return 'Wrong password.'
    return ''

async def get_session_token(conn: PoolAcquireContext, user_id: int) -> str:
    '''
    Generates a session token and returns it (and inserts a new active_sessions record into the table) or returns an existing one.
    '''
    user_session = await conn.fetchrow('SELECT session_token FROM active_sessions WHERE user_id = $1', user_id)
    if user_session:
        return user_session['session_token']
    else: 
        session_token = token_hex(16)
        await conn.execute('INSERT INTO active_sessions (user_id, session_token) VALUES ($1, $2)', user_id, session_token)
        return session_token

async def check_session(conn: PoolAcquireContext, session_token: str) -> bool:
    '''
    Checks if there is a record in active_sessions table with specified session token.
    '''
    exists = await conn.fetchrow('SELECT EXISTS (SELECT 1 FROM active_sessions WHERE active_sessions.session_token = $1)', session_token)
    return exists['exists']

async def get_user_id_by_session(conn: PoolAcquireContext, session_token: str) -> int:
    '''
    Gets user's id by session token.
    '''
    session_record = await conn.fetchrow('SELECT user_id FROM active_sessions WHERE active_sessions.session_token = $1', session_token)
    return session_record['user_id']

async def get_user_by_id(conn: PoolAcquireContext, user_id: str) -> Record:
    '''
    Gets user's id, login and name by his ID. Returns None if there is no record with specified ID.
    '''
    user = await conn.fetchrow('SELECT id, login, name FROM users WHERE id = $1', user_id)
    if not user: return
    return user