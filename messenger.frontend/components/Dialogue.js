import { useEffect, useRef, useState } from "react";
import styles from '@/styles/Messenger.module.scss'
import NetCommand from "./NetCommand";
import Socket from "./Socket";
import ConnectionMessageHandler from "./ConnectionMessageHandler";

const Dialogue = ({ selectedChatID, setSelectedChatID, userID }) => {
    const [message, setMessage] = useState('')
    const [receivedMessage, setReceivedMessage] = useState({})
    const [messageList, setMessageList] = useState([])

    const selectedChatIDRef = useRef(selectedChatID)
    const socket = useRef()
    const scrollableArea = useRef()

    let offset = 0;

    const handleSendMessage = () => {
        if (message !== '') {
            socket.current.send(NetCommand('send_message', {
                target_user_id: selectedChatID,
                text: message
            }))
            setMessageList([...messageList, { side: 'sender', text: message }])
            setMessage('')
        }
    }

    const receiveMessage = (data) => {
        console.log(data)
        if (data.chat_id === +selectedChatIDRef.current) {
            setReceivedMessage(data)
        }
    }
    const getMessages = (data) => {
        data.forEach((item) => {
            console.log(item)
            setMessageList(prevKey => [{ side: item.sender_id === userID.current ? 'sender' : 'receiver', text: item.message }, ...prevKey])
        })
    }
    const responseActions = {
        ignore: () => {},
        receive_message: receiveMessage,
        get_messages: getMessages
    }

    useEffect(() => {
        setMessageList([])
        if (selectedChatID !== null) {
            selectedChatIDRef.current = selectedChatID
            socket.current.send(NetCommand('get_messages', { target_user_id: selectedChatID, offset: offset }))
            offset += 10
        } else {
            selectedChatIDRef.current = null
        }
        
    }, [selectedChatID])
    useEffect(() => {
        socket.current = Socket(
            'ws://127.0.0.1:8000/ws/messenger/dialogue',
            null,
            (e) => ConnectionMessageHandler(e, responseActions)
        )
        document.addEventListener('keydown', (e) => { 
            if (e.key === 'Escape') setSelectedChatID(null) 
        })
        return () => {
            socket.current.close()
        }
    }, [])
    useEffect(() => {
        if (Object.keys(receivedMessage).length !== 0) {
            setMessageList([...messageList, { side: 'receiver', text: receivedMessage['text']}])
            setReceivedMessage('')
        } 
    }, [receivedMessage])
    useEffect(() => {
        if (scrollableArea.current) scrollableArea.current.scrollTop = scrollableArea.current.scrollHeight
    }, [messageList])
    useEffect(() => {
        if (scrollableArea.current) {
            scrollableArea.current.addEventListener('scroll', (e) => {
                if (e.target.scrollTop <= 100) {
                    socket.current.send(NetCommand('get_messages', { target_user_id: selectedChatID, offset: offset }))
                    offset += 10
                }
            })
        }
    }, [scrollableArea.current])

    return ( 
        <>
            {selectedChatID === null && <div className={styles.messengerWindowNoSelection}>Select a chat or create a new one</div>}
            {selectedChatID !== null && 
            <>
                <div className={styles.messengerWindowActive} ref={scrollableArea}>
                    {messageList.length > 0 && messageList.map((message, index) => (
                        message.side === 'sender' ? (
                            <div key={index} className={`${styles.messengerWindowActiveMessage} ${styles.messengerWindowActiveMessageOutgoing}`}>
                                {message.text}
                            </div>
                        ) : (
                            <div key={index} className={`${styles.messengerWindowActiveMessage} ${styles.messengerWindowActiveMessageIncoming}`}>
                                {message.text}
                            </div>
                        )
                    ))}
                    
                </div>
                <div className={styles.messengerWindowSend}>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} className={styles.messengerWindowSendInput} placeholder='Your message'></textarea>
                    <button onClick={handleSendMessage} className={styles.messengerWindowSendButton}></button>
                </div>
            </>}
            
        </>
    );
}
 
export default Dialogue;