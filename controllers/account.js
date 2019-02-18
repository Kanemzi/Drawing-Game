var crypto = require('crypto')
var htmlentities = require('html-entities').XmlEntities

var model = require('../models/account')

var room = require('./game/room')
var gamemode = require('./game/game_mode')
var player = require('./game/player')

var notifs = require('./notification')

function isLoggedIn(req) {
    return req.session.user != null
}

exports.load = function(req, res) {
    if (isLoggedIn(req)) // si l'utilisateur est connnecté à un compte
    {
        var pseudo = req.session.user

        model.getUserData(pseudo, (result, fields) => {
            var xp = result[0].xp
            var level = result[0].level
            var thune = result[0].thune
            var nb_play = result[0].nb_play
            var nb_win = result[0].nb_win


            res.render('account.ejs', { xp: xp, pseudo: pseudo, rooms: room.rooms, level: level, thune: thune, nb_play: nb_play, nb_win: nb_win }) // affichage de la page
        })
    } else {
        res.redirect('/')
    }
}

exports.action = function(action, req, res) {
    if (isLoggedIn(req)) {
        var pseudo = req.session.user

        switch (action) {
            case 'create_room': // TODO : ajouter le round count
                /*
                    Processus :
                    1 - Création et ajout de la partie dans le tableau l'owner indiqué est l'id du créateur
                    2 - Redirection du créateur sur une page game
                    3 - A la connexion sur la page game, un socket est ouvert, l'entité du joueur sur le serveur est créée ( test si il est le créateur)
                */

                if (!player.isPlaying(pseudo)) {
                    createRoom(pseudo, req, res)
                } else {
                    notifs.add(req, notifs.types.ERROR, 'Vous jouez déjà avec ce compte')
                    res.redirect('/account')
                }

                break

            case 'join_room':

                if (!player.isPlaying(pseudo)) {
                    joinRoom(pseudo, req, res)
                } else {
                    notifs.add(req, notifs.types.ERROR, 'Vous jouez déjà avec ce compte')
                    res.redirect('/account')
                }

                break

            case 'change_password':

                changePassword(pseudo, req, res)

                break

            case 'refresh_rooms':
                res.render('roomList.ejs', { rooms: room.rooms })
                break

            default:
                res.redirect('/account')
        }
    }
}

/*
    Crée une nouvelle room et redirige le créateur vers sa room
    En cas d'erreur, l'utilisateur est redirigé vers sa page de compte avec une notification d'erreur
*/
function createRoom(pseudo, req, res) {
    var name = req.body.game_name.trim()
    var priv = req.body.game_private
    var pass = req.body.game_password
    var mode = req.body.game_mode

    // vérification des données
    var error = false

    if (!name || !mode) {
        notifs.add(req, notifs.types.ERROR, 'Le formulaire de création de room est incorrect')
        error = true
    }

    if (name.length > 20) {
        notifs.add(req, notifs.types.ERROR, 'Le nom de la room est trop long (20 caractères max)') // nom de la room trop long
        error = true
    }

    if (name.length < 3) {
        notifs.add(req, notifs.types.ERROR, 'Le nom de la room est trop court (3 caractères min)') // nom de la room trop court
        error = true
    }

    var correct_gamemode = false

    for (var g in gamemode.GameMode) {
        var g_string = gamemode.GameMode[g].name
        debug('bla : ' + g_string)

        if (mode == g_string) {
            correct_gamemode = true
            mode = gamemode.GameMode[g]
            break
        }
    }

    if (!correct_gamemode) {
        notifs.add(req, notifs.types.ERROR, 'Le mode de jeu est incorrect')
        error = true
    }

    if (error) {
        res.redirect('/account')
    } else {
        name = htmlentities.encode(name)

        console.log('[Room]', pseudo, 'created new room :\n', req.body)

        var owner_token = crypto.randomBytes(32).toString('hex')

        var r = new room.Room(owner_token, pseudo, name, priv, pass, mode, 4)

        req.session.join_token = owner_token

        removeFromCurrentRoom(r.id, pseudo)

        r.waiting_players.push({ name: pseudo, token: req.session.join_token })

        res.redirect('/room/'.concat(r.id))
    }
}

/*
    Fait entrer un utilisateur dans une room. Si la connexion à la room est impossible, le joueur est redirigé vers la page de son compte
    avec une notification d'erreur.

    Si le joueur était déjà dans une autre room, il est supprimé de cette room
*/
function joinRoom(pseudo, req, res) {
    var token = req.body.token

    if (!token) {
        notifs.add(req, notifs.types.ERROR, 'Votre token de connexion est vide')
        res.redirect('/account')
    } else {
        var r = room.getRoomById(token)

        if (!r) {
            notifs.add(req, notifs.types.ERROR, 'La room n\'existe plus')
            res.redirect('/account')
        } else {
            if (r.priv && req.body.room_password != r.password) // mot de passe incorrect
            {
                notifs.add(req, notifs.types.ERROR, 'Mot de passe incorrect')
                res.redirect('/account')
            } else // logins corrects
            {
                var p = r.getPlayerByName(pseudo)

                var join_token = crypto.randomBytes(32).toString('hex')
                req.session.join_token = join_token

                if (pseudo == r.owner) {
                    r.owner_token = join_token
                }

                if (!r.isWaiting(pseudo)) // nouveau joueur
                {
                    if (!r.gc.allowPlayerJoin) {
                        notifs.add(req, notifs.types.ERROR, 'La partie est déjà lancée')
                        res.redirect('/account')
                        return
                    }

                    removeFromCurrentRoom(r.id, pseudo)

                    r.waiting_players.push({ name: pseudo, token: join_token })

                    console.log('[Room] Current Players (', r.name, ') : ', r.waiting_players)
                } else if (p && p.status != player.ConnectionStatus.CONNECTED) // reconnexion
                {
                    r.setJoinToken(pseudo, join_token)
                }

                res.redirect('/room/'.concat(r.id))
            }
        }
    }
}

/*
    Supprime un joueur de la room dans laquelle il se trouve actuellement si il veut join une autre room
*/
function removeFromCurrentRoom(new_token, pseudo) {
    var t = player.getJoinedRoom(pseudo)

    if (t && t != new_token) {
        var r = room.getRoomById(t)

        if (r) // si la room existe encore
            r.removePlayer(pseudo)
    }
}


/*
    Modifie le mot de passe de l'utilisateur et le déconnecte si la manipulation a fonctionnée
*/
function changePassword(pseudo, req, res) {
    var lastPass = req.body.ancienmdp
    var confirm = req.body.confirmation
    var newPass = req.body.nouvmdp

    if (!pseudo || !lastPass || !confirm || !newPass) {
        notifs.add(req, notifs.types.ERROR, 'Le formulaire de changement de mot de passe est incorrect')
        res.redirect('/account')
    } else {
        var hashLastPass = crypto.createHash('sha256').update(lastPass).digest('base64')

        model.getUserPassword(pseudo, (result, fields) => {

            var pass = result[0].pass

            if (hashLastPass == pass) {
                if (newPass == confirm) {
                    if (newPass.length < 4) {
                        notifs.add(req, notifs.types.ERROR, 'Votre nouveau mot de passe doit comporter au moins 4 caractères')
                        res.redirect('/account')
                    } else {
                        var hashNewPass = crypto.createHash('sha256').update(newPass).digest('base64')

                        model.postNewPass(pseudo, hashNewPass, (result, fields) => {
                            notifs.add(req, notifs.types.SUCCESS, 'Le mot de passe a bien été modifié')
                            res.redirect('/logout')
                        })
                    }
                } else {
                    notifs.add(req, notifs.types.ERROR, 'Les deux nouveaux mots de passe ne correspondent pas')
                    res.redirect('/account')
                }
            } else {
                notifs.add(req, notifs.types.ERROR, 'Le mot de passe actuel est incorrect')
                res.redirect('/account')
            }
        })
    }
}