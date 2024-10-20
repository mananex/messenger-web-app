from asyncpg.pool import PoolAcquireContext
from helpers import chat_sockets, dialogue_sockets, \
                    check_name, get_user_by_id, check_ID, check_session, get_user_id_by_session
from fastapi import WebSocket
from typing import Dict, List, Any
from configuration import MESSAGE_LIMIT

async def get_user_by_session(conn: PoolAcquireContext, arguments: dict, user_id: int) -> dict:
    '''
    arguments: dict should contain a 'session_token' key with active session token as a value.
    '''
    session_record =  await conn.fetchrow('SELECT user_id FROM active_sessions WHERE active_sessions.session_token = $1', arguments['session_token'])
    return { 
        'data': dict(await conn.fetchrow('SELECT id, login, name FROM users WHERE id = $1', session_record['user_id'])),
        'error': ''
    }

async def set_name(conn: PoolAcquireContext, arguments: dict, user_id: int) -> dict:
    '''
    arguments: dict should contain a 'new_name' key with new name as a value.
    '''
    name_incorrect = await check_name(arguments['new_name'])
    if not name_incorrect: await conn.execute('UPDATE users SET name = $1 WHERE id = $2', arguments['new_name'], user_id)
    return {
        'data': {},
        'error': name_incorrect
    }

async def create_chat(conn: PoolAcquireContext, arguments: dict, user_id: int) -> dict:
    '''
    arguments: dict should contain a 'second_user_id' key with second user's ID as a value.
    '''
    error = ''
    second_user = None
    id_incorrect = await check_ID(arguments['second_user_id'])
    if id_incorrect:
        error = id_incorrect
    else:
        second_user_id = int(arguments['second_user_id'])
        if user_id == second_user_id: 
            error = 'You cant create a chat with yourself.'
        else:
            second_user = await get_user_by_id(conn, second_user_id)
            if second_user:
                chat_record = await conn.fetchrow('''
                                                    SELECT EXISTS (
                                                    SELECT 1 FROM chats 
                                                    WHERE (starter_user_id = $1 AND target_user_id = $2)
                                                    OR    (starter_user_id = $2 AND target_user_id = $1)
                                                    )''', user_id, second_user_id)
                if not chat_record['exists']: 
                    await conn.execute('INSERT INTO chats (starter_user_id, target_user_id) VALUES ($1, $2)', user_id, second_user_id)
                    initial_user = dict(await get_user_by_id(conn, user_id))
                    if second_user_id in chat_sockets:
                        await chat_sockets[second_user_id].send_json({ 'action': 'create_chat', 'data': initial_user, 'error': ''})
                else: 
                    error = 'You already have a conversation with this user.'
            else: 
                error = 'There is no user with specified ID.'
    
    data = None
    if second_user: 
        data = dict(second_user)
    return {
        'data': data,
        'error': error
    }

async def get_chats(conn: PoolAcquireContext, arguments: dict, user_id: int) -> dict:
    '''
    No arguments needed.
    '''
    chat_records = await conn.fetch('''
                              SELECT starter_user_id, target_user_id FROM chats 
                              WHERE starter_user_id = $1 OR target_user_id = $1
                              ''', user_id)
    second_user_id_list = [chat_record['target_user_id'] if 
                           chat_record['target_user_id'] != user_id else 
                           chat_record['starter_user_id'] 
                           for chat_record in chat_records]
    second_users = [dict(await get_user_by_id(conn, second_user_id)) for second_user_id in second_user_id_list]
    return {
        'data': second_users,
        'error': ''
    }

async def send_message(conn: PoolAcquireContext, arguments: dict, user_id: int) -> dict:
    '''
    arguments: dict should contain a 'target_user_id' with second user's id and a 'text' key with message text.
    '''
    target_user_id = int(arguments['target_user_id'])
    await conn.execute('INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1, $2, $3)', user_id, target_user_id, arguments['text'])

    if target_user_id in dialogue_sockets:
        await dialogue_sockets[target_user_id].send_json({ 'action': 'receive_message', 'data': { 'text': arguments['text'], 'chat_id': user_id }, 'error': ''})
    return {
        'data': {},
        'error': ''
    }

async def get_messages(conn: PoolAcquireContext, arguments: dict, user_id: int) -> dict:
    '''
    arguments: dict should contain a 'target_user_id' with second user's id and 'offset' with the message offset (for postgresql)
    '''
    message_records = await conn.fetch('''
                    SELECT * FROM messages
                    WHERE (sender_id = $1 AND receiver_id = $2) 
                    OR    (sender_id = $2 AND receiver_id = $1)
                    ORDER BY id DESC
                    LIMIT $3
                    OFFSET $4
               ''', user_id, int(arguments['target_user_id']), MESSAGE_LIMIT, int(arguments['offset']))
    messages = [dict(message) for message in message_records]
    return {
        'data': messages,
        'error': ''
    }

NETCOMMANDS = {
    'get_user_by_session': {
        'function': get_user_by_session,
        'action': 'get_user_by_session'
    },
    'set_name': {
        'function': set_name,
        'action': 'ignore'
    },
    'create_chat': {
        'function': create_chat,
        'action': 'create_chat'
    },
    'get_chats': {
        'function': get_chats,
        'action': 'get_chats'
    },
    'send_message': {
        'function': send_message,
        'action': 'ignore'
    },
    'get_messages': {
        'function': get_messages,
        'action': 'get_messages'
    }, 
}

async def message_handler(conn: PoolAcquireContext, command: dict, websocket: WebSocket, user_id: List[Any], socket_save_dict: Dict[int, WebSocket] = None) -> bool:
    '''
    Processes messages from client. Returns False if socket verification was failed, otherwise - True.
    '''
    if command['command'] == 'verify_session':
        exists = await check_session(conn, command['arguments']['session_token'])
        if exists:
            user_id[0] = await get_user_id_by_session(conn, command['arguments']['session_token'])
            if socket_save_dict != None: socket_save_dict[user_id[0]] = websocket
            print(socket_save_dict)
        else: 
            websocket.close()
            return False
    else:
        result = await NETCOMMANDS[command['command']]['function'](conn, command['arguments'], user_id[0])
        await websocket.send_json({'action': NETCOMMANDS[command['command']]['action'], 'data': result['data'], 'error': result['error']})
    return True