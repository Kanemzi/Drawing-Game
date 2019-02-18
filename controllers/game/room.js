var crypto = require('crypto')

var player = require('./player')
var chat = require('./chat')
var canvas = require('./canvas')
var control = require('./control')
var notifs = require('../notification')
var model = require('../../models/room')

var gm = require('./game_mode')

/*
    tableau de Room
    liste toutes les salles actuellement ouvertes
*/
var rooms = []

/*
    Constante représentant le channel principal dans la sauverage de message des rooms
*/
const MAIN_CHANNEL = 0



/*
    Retourne l'instance d'une room en fonction de son id
    Retourne null si l'object n'existe pas
*/
function getRoomById(id)
{
    var i = rooms.findIndex(function(room) {
       return room.id == id
    })

    return (i == -1) ? null : rooms[i]
}

/*
    Constructeur d'une room
    name : le nom de la salle
    priv : = true si la partie est privée
    password : le mot de passe pour accèder à la salle ( == "" si la room est publique)
    battlemode : = true si le mode 1v1 est activé
    owner : le nom du créateur de la game
*/
function Room(owner_token, owner, name, priv, password, game_mode, round_count)
{
    this.waiting_players = [] // les numéros et token de chaque joueur ayant demandé à se connecter à la room
    this.players = []

    this.name = name
    this.priv = priv
    this.password = password

    this.game_mode = game_mode
    this.Controller = new this.game_mode.controller(this)

    this.round_count = round_count

    this.owner = owner
    this.owner_token = owner_token
    this.hasowner = false // = true quand l'owner de la game a rejoint

    this.messages_history = []// premier index : channel, second index: message  -> channel principal = MAIN_CHANNEL
    this.canvas_history = [] // premier index : canvas, second index : message -> channnel principal = MAIN_CHANNEL

    this.id = crypto.randomBytes(32).toString('hex') //générer un id unique

    this.started = false
    this.ended = false // la partie est considérée comme finie par le game controller
    this.closing = false // la partie est en cours de fermeture

    // Initialisation du warmup
    this.gc = new gm.gcs.WarmUp(this)
    this.gc.init()
    this.gc.createChannel(MAIN_CHANNEL)
    this.gc.createCanvas(MAIN_CHANNEL)

    rooms.push(this)
}

/*
    Lance la partie
    (après, le lançement, les joueurs ne peuvent plus rejoindre la room,
    La fonction supprime les joueur déconnectés au moment du lançement)
*/
Room.prototype.start = function()
{
    this.gc.end() // fin du warmup

    // suppression des joueurs déconnectés
    for (var i = 0; i < this.players.length; i++) {
        if (this.players[i].status == player.ConnectionStatus.CONNECTION_ERROR)
        {
            this.removePlayer(this.players[i].name)
        }
    }

    this.gc = this.Controller
    this.gc.init()
    this.gc.createChannel(MAIN_CHANNEL)
    this.gc.createCanvas(MAIN_CHANNEL)

    this.started = true
    this.ended = false
    this.closing = false
    this.gc.start()
}

/*
    Fermer la room ( en la supprimant du tableau des rooms)
*/
Room.prototype.close = function ()
{
    if (this.closing) return
    
    this.closing = true
    
    // prévenir les joueurs de la fermeture de la room
    io.sockets.in(this.id).emit('room_closed')

    for (let i = 0 ; i < this.players.length; i++)
    {
        debug('close : ' + this.players[i].name + '  ')
        clearInterval(this.players[i].ping)
    }

    for(var i = 0 ; i < rooms.length ; i++)
    {
        if (rooms[i].id == this.id)
        {
            rooms.splice(i, 1)
            break
        }
    }

    console.log('[Room] room \'', this.name, '\' closed')
}

/*
    Ajoute un utilisateur à la partie à partir de son socket
*/
Room.prototype.addPlayer = function (socket)
{
    var name = socket.handshake.query.name
    var token = socket.handshake.query.token

    if (!name || !token)
    {
        socket.emit('room_join_error')
        return
    }

    var status = this.getStatus(name)

    if (this.isWaiting(name) && status != player.ConnectionStatus.CONNECTED) // vérifie que le joueur est bien accepté dans la room et si il n'est pas déjà connecté
    {
        var trueToken = this.getJoinToken(name)

        if ( token == trueToken) // vérifie que le token du joueur est valide
        {
            var p

            if (status == player.ConnectionStatus.CONNECTION_ERROR) // Le joueur se reconnecte après une erreur
            {
                p = this.getPlayerByName(name)

                console.log('[Socket] Reconnect, ( user :', name, ', room :', this.name, ')')

                // annoncer le retour du joueur aux autres joueurs de la room
                socket.broadcast.to(this.id).emit('player_reconnect', {name: name, level: p.level })

                notifs.send(socket.broadcast.to(this.id), notifs.types.SUCCESS, name.concat(' est de retour !'))

                if (p.timeout)
                {
                    clearTimeout(p.timeout)
                }
                
                p.reset_ping()

		        p.status = player.ConnectionStatus.CONNECTED
		        
                p.socket = socket
                socket.player = p // attacher la nouvelle socket au joueur
                socket.join(this.id) // rejoindre la room
            }
            else // Le joueur ne s'est jamais connecté ou a dépassé le timeout de reconnexion
            {
                if (!this.gc.allowPlayerJoin) return // si la partie a déjà commencée, empêcher le joueur de rejoindre

                console.log('[Socket] New connection, ( user :', name, ', room :', this.name, ')')
                // création de l'instance du joueur et ajout dans le tableau des joueurs de la room
                p = new player.Player(name, null, socket, 0)
                socket.player = p

                this.players.push(p)

                // le socket doit rejoindre la room
                socket.join(this.id)

                // teste si le joueur est l'owner de la game
                if (token == this.owner_token)
                {
                    this.hasowner = true
                    this.gc.start() // lancement du warm up
                }

                // annoncer le join aux autres joueurs de la room
                socket.broadcast.to(this.id).emit('player_join', {name: name, level: p.level })

                notifs.send(socket.broadcast.to(this.id), notifs.types.SUCCESS, name.concat(' a rejoint la room !'))
            }



            // donner la liste des joueurs connectés au nouveau joueur
            for (var i = 0; i < this.players.length; i++)
            {
                var pl = this.players[i]
                socket.emit('player_join', {name: pl.name, level: pl.level })

                if(pl.status == player.ConnectionStatus.CONNECTION_ERROR)
                {
                    io.sockets.in(this.id).emit('player_connection_lost', {name: pl.name})
                }
            }

            // mise en place des events liés au chat pour le joueur
            chat.setupEvents(this, socket)

            // envoi des 10 derniers messages du chat au nouveau joueur
            var nb_messages = this.messages_history[MAIN_CHANNEL].length
            for (var i = Math.max( 0, nb_messages - 10 ) ; i < nb_messages ; i++)
            {
                socket.emit('chat_new_message', this.messages_history[MAIN_CHANNEL][i])
            }

            // mise en place des events liés au canvas pour le joueur
            canvas.setupEvents(this, socket)


            for (var i = 0; i < this.canvas_history[MAIN_CHANNEL].length ; i++)
            {
                var message = this.canvas_history[MAIN_CHANNEL][i]
                socket.emit(message.type, message.data)
            }

            // mise en place des events liés au contrôle des états du jeu (réponse aux question etc...)
            control.setupEvents(this, socket)

            this.gc.join(p) // fire l'event de join
            
        }
    }
}

/*
    Lance le timeout de 30 secondes avant la suppression du joueur associé au socket de la room
    Prévient les autres joueurs du problème de connection
*/
Room.prototype.startConnectionTimeout = function(socket)
{
    var p = socket.player
    if (!p) return

    p.status = player.ConnectionStatus.CONNECTION_ERROR

    if (!this.started) // autoriser la suppression de la room seulement si la partie n'est pas commencée
        p.timeout = setTimeout( () => {
            this.removePlayer(p.name)
        }, 10000)

    notifs.send(socket.broadcast.to(this.id), notifs.types.ERROR, p.name.concat(' a été déconnecté !'))

    io.sockets.in(this.id).emit('player_connection_lost', {name: p.name})

    console.log('[Socket] Disconnect, ( user :', p.name, ')')
}

/*
    Supprime un joueur de la pratie et de la waiting list
*/
Room.prototype.removePlayer = function (name)
{
    // le joueur n'est pas supprimé si la partie est lancée
    if (this.started && !this.closing) return

    var p = this.getPlayerByName(name)
    if (p)
    {
        console.log('[Socket] Room quit, ( user :', name, ')')

        var t = p.timeout

        if (t)
        {
            clearTimeout(t)
        }
        
        t = p.ping
        
        if (t)
        {
            clearInterval(t)
        }

        var i = this.players.indexOf( p )
        if (i != -1)
            this.players.splice(i, 1)

        // suppression de la waiting list
        i = this.getPlayerIndexInWaitingList(name)

        if (i != -1)
            this.waiting_players.splice(i, 1)

        // test si le joueur était l'owner
        if (name == this.owner)
        {
            // close la room et éjecter les gens
            this.hasowner = false
            if (!this.closing) this.close()
        }

        p.socket.disconnect(true)
        io.sockets.in(this.id).emit('player_quit', {name: name})
    }
}

/*
    Retourne l'index du joueur associé au nom [name] dans la liste des joueurs inscrits à la room
*/
Room.prototype.getPlayerIndexInWaitingList = function (name)
{
    var i = this.waiting_players.findIndex( function(player) {
       return player.name == name
    })

    return i
}

/*
    Retourne l'instance d'un joueur en fonction de son nom
    Retourne null si l'object n'existe pas
*/
Room.prototype.getPlayerByName = function (name)
{
    var i = this.players.findIndex(function(player) {
       return player.name == name
    })

    return (i == -1) ? null : this.players[i]
}

/*
    Vérifie si un joueur est associé à un token de connexion dans la room
    - Retourne true si le joueur est inscrit, false sinon
*/
Room.prototype.isWaiting = function(name)
{
    var i = this.waiting_players.findIndex(function(player) {
       return player.name == name
    })

    return i != -1
}

/*
    Retourne le status de connexion du joueur dans la room
*/
Room.prototype.getStatus = function(name)
{
    var p = this.getPlayerByName(name)
    return (p != null) ? p.status : player.ConnectionStatus.NOT_CONNECTED
}

/*
    Retourne le token associé à un joueur dans la waiting list
    -> /!\ Cette fonction ne vérifie pas si le joueur est dans la liste :
            il faut donc vérifier cela avec la fonction isWaiting avant
*/
Room.prototype.getJoinToken = function(name)
{
    return this.waiting_players[ this.getPlayerIndexInWaitingList(name) ].token
}

Room.prototype.setJoinToken = function(name, token)
{
    var i = this.getPlayerIndexInWaitingList(name)
    this.waiting_players[i].token = token
}

exports.Room = Room
exports.rooms = rooms
exports.getRoomById = getRoomById
exports.MAIN_CHANNEL = MAIN_CHANNEL
