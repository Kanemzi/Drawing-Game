/*
    Active les events liés au canvas dans une room pour un socket
    structure d'un message canvas_draw_line : { x1, y1, x2, y2, color, radius }
*/
function setupEvents(room, socket)
{
    socket.on('canvas_draw_line', function(line) {
       var l = {x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, color: line.color, radius: line.radius}

        //room.canvas_history.push({type: 'canvas_draw_line', data: l})

        if (room.gc.state) room.gc.state.onCanvasMessage(socket.player, {type: 'canvas_draw_line', data: l})
        //io.in(room.id).emit('canvas_draw_line', l)
    })

    socket.on('canvas_draw_point', function(point) {
       var p = {x: point.x, y: point.y, color: point.color, radius: point.radius}

//        room.canvas_history.push({type: 'canvas_draw_point', data: l})

        if (room.gc.state) room.gc.state.onCanvasMessage(socket.player, {type: 'canvas_draw_point', data: p})
        //io.in(room.id).emit('canvas_draw_point', l)
    })
    
    socket.on('canvas_clear', function(color) {
       var c = {color: color}

//        room.canvas_history.push({type: 'canvas_draw_point', data: l})

        if (room.gc.state) room.gc.state.onCanvasMessage(socket.player, {type: 'canvas_clear', data: c})
        //io.in(room.id).emit('canvas_draw_point', l)
    })
}

/*
    Supprime la sauvegarde du dessin actuel sur le serveur
*/
function clearHistory(room)
{
    room.canvas_history = []
}

exports.setupEvents = setupEvents
