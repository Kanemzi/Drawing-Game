var htmlentities = require('html-entities').XmlEntities

/*
    Active les events liés au chat dans une room pour un socket
*/
function setupEvents(room, socket)
{

    socket.on('chat_new_message', function(message) {

        if (message.trim().length > 0)
        {
            var m = {name: socket.player.name, text: htmlentities.encode(message)}

            //room.messages_history.push(m)

            if (room.gc.state) room.gc.state.onChatMessage(socket.player, {type: 'chat_new_message', data: m} )
        }
    })
}

/*
    Modifie le message passé en paramètre pour lui ajouter une couleur
    (Retourne aussi la référence vers ce même message)
*/
function colorize(message, color)
{
    message.data.color = color
    return message
}

exports.setupEvents = setupEvents
exports.colorize = colorize
