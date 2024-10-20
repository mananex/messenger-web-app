const NetCommand = (commandName, argumentsObject) => JSON.stringify({ command: commandName, arguments: argumentsObject })
export default NetCommand;