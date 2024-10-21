const ConnectionMessageHandler = (e, responseActionsObject) => {
    let response = JSON.parse(e.data)
    if (response.action in responseActionsObject) {
        if (!response.error) responseActionsObject[response.action](response.data)
        else alert(response.error)
    } else {
        console.log('There is no responseAction function for this response: ', response)
    }
}
 
export default ConnectionMessageHandler;