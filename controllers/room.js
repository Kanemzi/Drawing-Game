var env = require('../.env')
var room = require('./game/room')
var notifs = require('./notification')

exports.join = function(req, res)
{
    var r = room.getRoomById(req.params.roomnum)
    if ( !r )
    {
        res.render('404.ejs')
    }
    else
    {
        if (!r.isWaiting(req.session.user))
        {
            notifs.add(req, notifs.types.ERROR, 'Vous n\'êtes pas inscrit dans cette room')
            res.redirect('/account')
        }
        else
        { // générer la page de la room (avec connexion socket par token)
            res.render('game.ejs', { room : r.id,
                                     join_token : req.session.join_token,
                                     name : req.session.user,
                                     room_name : r.name,
                                     server_addr : env.SERVER_ADDR,
                                     socket_port : env.SOCKET_PORT,
                                     owner : (req.session.user == r.owner)
                                    })
        }
    }
}
