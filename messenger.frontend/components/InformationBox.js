import styles from '@/styles/Messenger.module.scss';
import { useEffect, useRef, useState } from 'react';
import NetCommand from '@/utils/NetCommand';
import Socket from '@/utils/Socket';
import Cookies from 'js-cookie';
import ConnectionMessageHandler from '@/utils/ConnectionMessageHandler';

const InformationBox = ({ setChatList, userID }) => {
    const [name, setName] = useState()
    const [connectID, setConnectID] = useState(null)
    const [selfData, setSelfData] = useState({})
    
    const socket = useRef()

    const handleSaveName = (e) => {
        socket.current.send(
            NetCommand('set_name', { new_name: name })
        )
    }
    const handleConnectToUser = (e) => {
        socket.current.send(
            NetCommand('create_chat', { second_user_id: connectID })
        )
    }
    const setUserInformation = (data) => {
        document.title = 'User ' + data.login
        setSelfData(data)
    }
    const addNewChat = (data) => {
        setChatList(prevKey => [...prevKey, data])
    }
    const handleConnectionOpen = () => {
        socket.current.send(
            NetCommand('get_user_by_session', { 'session_token': Cookies.get('session_token') })
        )
    }
    const responseActions = {
        ignore: () => null,
        get_user_by_session: setUserInformation,
        create_chat: addNewChat,
    }

    useEffect(() => {
        socket.current = Socket(
            'ws://127.0.0.1:8000/ws/messenger/information', 
            handleConnectionOpen,
            (e) => ConnectionMessageHandler(e, responseActions)
        )
        return () => {
            socket.current.close()
        }
    }, [])
    useEffect(() => { 
        if (selfData) { 
            userID.current = selfData.id
            setName(selfData.name)
        }
    }, [selfData])

    return (
        <>
            {typeof selfData !== 'undefined' && 
            <div className={`${styles.messengerInformation} ${styles.messengerBox}`}>
                <div className={styles.messengerInformationID}>ID: {selfData.id}</div>
                <div className={styles.messengerInformationName}>
                    <label className={styles.messengerInformationNameLabel}>Name:</label>
                    <input className={styles.messengerInformationInput} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder='Your name' />
                    <button className={styles.messengerInformationButton} onClick={(e) => handleSaveName(e)}>save</button>
                </div>
                <div className={styles.messengerInformationNewChat}>
                    <input className={styles.messengerInformationInput} type="text" onChange={(e) => setConnectID(e.target.value)} placeholder="user ID"/>
                    <button className={styles.messengerInformationButton} onClick={(e) => handleConnectToUser(e)}>connect</button>
                </div>
            </div>}
            
        </>
    );
}
 
export default InformationBox;