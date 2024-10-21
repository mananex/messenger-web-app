import NetCommand from "./NetCommand"
import Cookies from "js-cookie"

const Socket = (url, onConnectionOpen = null, onConnectionMessage = null, onConnectionClose = null) => {
    let socket = new WebSocket(url)
    socket.onmessage = onConnectionMessage
    socket.onclose = onConnectionClose
    socket.onopen = () => {
        socket.send(NetCommand('verify_session',  { 'session_token': Cookies.get('session_token') }))
        if (onConnectionOpen) onConnectionOpen()
    }
    return socket
}
 
export default Socket;