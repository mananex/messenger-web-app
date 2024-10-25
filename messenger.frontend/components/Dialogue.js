import { useEffect, useRef, useState } from "react";
import styles from '@/styles/Messenger.module.scss'
import NetCommand from "@/utils/NetCommand";
import Socket from "@/utils/Socket";
import ConnectionMessageHandler from "@/utils/ConnectionMessageHandler";

const Dialogue = ({ selectedChatID, setSelectedChatID, userID }) => {
    const [message, setMessage] = useState('')
    const [receivedMessage, setReceivedMessage] = useState({})
    const [messageList, setMessageList] = useState([])

    const selectedChatIDRef = useRef(selectedChatID)
    const socket = useRef()
    const scrollableArea = useRef()
    const messageRef = useRef(message)
    const messageListRef = useRef(messageList)
    const offset = useRef(0)
    const previousOffset = useRef(0)

    let shiftPressed = false;

    const handleSendMessage = () => {
        if (messageRef.current !== '') {
            socket.current.send(NetCommand('send_message', {
                target_user_id: selectedChatIDRef.current,
                text: messageRef.current
            }))
            setMessageList([...messageListRef.current, { side: 'sender', text: messageRef.current }])
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
        setMessage('')
        if (selectedChatID !== null) {
            selectedChatIDRef.current = selectedChatID
            socket.current.send(NetCommand('get_messages', { target_user_id: selectedChatID, offset: offset.current }))
            offset.current += 10
        } else {
            selectedChatIDRef.current = null
        }
        
    }, [selectedChatID])
    useEffect(() => {
        socket.current = Socket(
            process.env.NEXT_PUBLIC_DIALOGUE_WEBSOCKET_ENDPOINT,
            null,
            (e) => ConnectionMessageHandler(e, responseActions)
        )
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                setSelectedChatID(null)
            }
            else if (e.key === 'Shift') {
                shiftPressed = true
                
            } else if (e.key === 'Enter') {
                if (!shiftPressed) {
                    handleSendMessage()
                    setMessage('')
                }
            }
        })
        document.addEventListener('keyup', (e) => { 
            if (e.key === 'Shift') { shiftPressed = false }
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
        if (scrollableArea.current) {
            scrollableArea.current.addEventListener('scroll', (e) => {
                if (e.target.scrollTop < 100) {
                    socket.current.send(NetCommand('get_messages', { target_user_id: selectedChatID, offset: offset.current }))
                    offset.current += 10
                }
            })
        }
    }, [scrollableArea.current])
    useEffect(() => {
        console.log(previousOffset.current, offset.current)
        if (scrollableArea.current) {
            if (previousOffset.current != offset.current) {
                scrollableArea.current.scrollTop = 250
                previousOffset.current = offset.current
            } else { 
                scrollableArea.current.scrollTop = scrollableArea.current.scrollHeight
            }
        }
        messageListRef.current = messageList 
    }, [messageList])
    useEffect(() => { 
        messageRef.current = message 
    }, [message])

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