import styles from '@/styles/Messenger.module.scss';
import { useEffect, useRef, useState } from 'react';
import NetCommand from './NetCommand';
import Socket from './Socket';
import ConnectionMessageHandler from './ConnectionMessageHandler';

const ChatList = ({ setSelectedChatID, chatList, setChatList }) => {
    const socket = useRef()

    const initialChatsLoading = (data) => {
        setChatList(data)
    }
    const addNewChat = (data) => {
        setChatList(prevKey => [...prevKey, data])
    }
    const responseActions = {
        ignore: () => null,
        get_chats: initialChatsLoading,
        create_chat: addNewChat,
    }
    const handleConnectionOpen = () => {
        socket.current.send(NetCommand('get_chats', {}))
    }

    useEffect(() => {
        socket.current = Socket(
            'ws://127.0.0.1:8000/ws/messenger/chatlist',
            handleConnectionOpen,
            (e) => ConnectionMessageHandler(e, responseActions)
        )
        return () => {
            socket.current.close()
        }
    }, [])
    useEffect(() => {
        if (socket.current) {
            const chatElements = document.querySelectorAll('[data-second-user-id]')
            chatElements.forEach(element => {
                element.addEventListener('click', (e) => {
                    let secondUserID = element.getAttribute('data-second-user-id')
                    setSelectedChatID(secondUserID)
                })
            })
        }
    }, [chatList])

    return ( 
        <div className={`${styles.messengerChats} ${styles.messengerBox}`}>
            {chatList.length == 0 && <div className={styles.messengerChatsNoChat}>No chats :(</div>}
            {chatList.length > 0 && 
                chatList.map((item) => (
                    <div className={styles.messengerChatsChat} key={item.id} data-second-user-id={`${item.id}`}>
                        <div className={styles.messengerChatsChatTitle}>{item.login} - {item.name}</div>
                        <div className={styles.messengerChatsChatLastMessage}>Hi! How are you?</div>
                        <div className={styles.messengerChatsChatMore}>MORE</div>
                    </div>
                ))
            }
        </div>
    );
}
 
export default ChatList;