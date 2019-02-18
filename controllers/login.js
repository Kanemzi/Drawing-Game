var crypto = require('crypto')
var model = require('../models/login')
var notifs = require('./notification')
var room = require('./game/room')
var player = require('./game/player')

exports.login = function(req, res)
{
    var pseudo = req.body.pseudo
    var password = req.body.password
    var hash = crypto.createHash('sha256').update(password).digest('base64')

    if (!pseudo || !password )
    {
      notifs.add(req, notifs.types.ERROR, 'Le formulaire de connexion n\'est pas valide')
      res.redirect('/')
    }
    else
    {
        model.checkValidLogin(pseudo, hash, (valid) => {
            if (valid)
            {

                model.updateLastConnection(pseudo, () => {
                })
              
                req.session.user = pseudo
                console.log('[Connect] \'', pseudo, '\' logged in')

                notifs.add(req, notifs.types.SUCCESS, 'bonjour ' + pseudo + '!')

                res.redirect('/account')
            }
            else
            {
                notifs.add(req, notifs.types.ERROR, 'le pseudo ou mot de passe est incorrect')
                res.redirect('/')
            }
        })
    }
}

exports.logout = function(req, res)
{
    var pseudo = req.session.user

    if (pseudo)
    {
        if (player.hasJoinedRoom(pseudo))
        {
            var r = room.getRoomById(player.getJoinedRoom(pseudo))

            if (r) // déconnecter le joueur de sa room actuelle
            {
                r.removePlayer(pseudo)
            }
        }

        req.session.destroy( () => {
            console.log('[Disconnect] \'', pseudo, '\' logged out')
        })
    }

    res.redirect('/')
}
