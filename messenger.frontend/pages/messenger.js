import { useEffect, useRef, useState } from 'react';
import styles from '../styles/Messenger.module.scss'
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import ChatList from '@/components/ChatList';
import InformationBox from '@/components/InformationBox';
import Dialogue from '@/components/Dialogue';

const Messenger = () => {
    const [selectedChatID, setSelectedChatID] = useState(null)
    const [chatList, setChatList] = useState([])

    const router = useRouter()
    const socket = useRef()
    const userID = useRef()

    useEffect(() => {
        const sessionObject = { session_token: Cookies.get('session_token') }
        if (!sessionObject.session_token) {
            router.push('/login')
            return;
        }

        let errorMessage = ''
        fetch('http://127.0.0.1:8000/verify-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionObject)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.log(errorMessage) 
                alert(errorMessage)
                router.push('/login')
            }
        })
        .catch(error => { 
            console.log(error) 
            return false;
        })

        return () => { if (socket.current) socket.current.close() }
    }, [])

    return (
        <section className={styles.messenger}>
            <div className={styles.messengerNested}>
                <ChatList setSelectedChatID={setSelectedChatID} chatList={chatList} setChatList={setChatList}/>
                <InformationBox setChatList={setChatList} userID={userID}/>
            </div>
            <div className={`${styles.messengerWindow} ${styles.messengerBox}`}>
                <Dialogue selectedChatID={selectedChatID} setSelectedChatID={setSelectedChatID} userID={userID}/>
            </div>
        </section>
    )
}
 
export default Messenger