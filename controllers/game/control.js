/*
    Active les events liés au contrôle d'état dans une room pour un socket
*/
function setupEvents(room, socket)
{
    socket.on('state_question_answer', function(stateInfo)
    {
        var m = {id : stateInfo.id , ans : stateInfo.ans}
        if (room.gc.state) room.gc.state.onControlMessage(socket.player, {type: 'state_question_answer', data: m} )
    })
    
    socket.on('alive', function(data) {
        socket.player.alive_timeout = 0
        if (socket.player.timeout) {
            clearInterval(socket.player.timeout)
        }
    })
}

exports.setupEvents = setupEvents
