var model = require('../../models/room')

// pour récupérer les informations sur les états de connexion des joueurs
var room = require('./room')

// Différents états de connexion du joueur à la room
var ConnectionStatus = {
    CONNECTED : 0, // Le joueur est connecté à la room est est dans la partie
    NOT_CONNECTED : 1, // Le joueur ne s'est toujours pas connecté à la room mais a demandé à se connecter
    CONNECTION_ERROR : 2 // Le joueur a été déconnecté de la room et dispose de 30 secondes pour la rejoindre de nouveau (il conservera alors son score)
                        // Lorsque le joueur est déconnecté, la case correspondant à son pseudo est grisée chez les clients connectés à la room
                        // A la fin du timeout de 30 secondes, le joueur est supprimé de la room. Il peut se reconnecter à la room mais perdra son score
}

var MAX_CO_TIMEOUT = 5 // timeout avant déconnexion du joueur dans la room

/*
    Crée un utilisateur in game
    L'instance est crée lorsqu'un joueur parvient à se connecter à une room (publique ou privée)
    L'instance est supprimée à la fin de la partie à laquelle le joueur est associé
*/
function Player(name, avatar, socket, level)
{
    this.status = ConnectionStatus.CONNECTED
    this.name = name
    this.level = level
    this.avatar = avatar // type non défini : sera une liste d'indexes de chaque sous-image de l'avatar (indexes définis ds BDD)
    this.socket = socket // le socket par lequel le serveur communique avec le client
    this.alive_timeout = 0
    
    this.reset_ping = function() {
        this.alive_timeout = 0
    }
    
    this.ping = setInterval( () => { // ping pour savoir si le joueur est connecté
        //debug(this.name + "  " + this.alive_timeout)
        if (this.alive_timeout ++ >= MAX_CO_TIMEOUT)
        {
            if (isPlaying(this.name))
            {
                this.room.startConnectionTimeout(socket)
            }
        }
    }, 1000)
    
    this.room = room.getRoomById(getJoinedRoom(this.name))
}

/*
    Met à jour les données de l'utilisateur dans la base de données :
    - Augmente compteur de parties
    - Augmente compteur de parties gagnées
    - Incrémente argent du joueur
    (autres stats ...)
*/
Player.prototype.save = function ()
{
    model.SetScore(this.score, this.name, () => {})
}

/*
    Retourne l'id de la room dans laquelle le joueur se trouve
    actuellement, null si il ne joue pas

    /!\ Un joueur n'est pas considéré comme 'connecté' quand il
    est inscrit dans une room mais qu'il est acutellement
    déconnecté de cette room
*/
function getCurrentRoom(name)
{
    var room_count = room.rooms.length
    for (var i = 0; i < room_count ; i++)
    {
        var r = room.getRoomById(room.rooms[i].id)
        if (r)
        {
            var p = r.getPlayerByName(name)
            if (p) // le joueur est dans cette room
            {
                if  (p.status == ConnectionStatus.CONNECTED)
                {
                    return r.id
                }
                else
                {
                    return null
                }
            }
        }
    }
    return null
}

/*
    Retourne true si le joueur est actuellement en train de jouer
*/
function isPlaying(name)
{
    return getCurrentRoom(name) != null
}

/*
    Retourne l'id de la room dans laquelle le joueur est inscrit
*/
function getJoinedRoom(name)
{
    var room_count = room.rooms.length
    for (var i = 0; i < room_count ; i++)
    {
        var r = room.getRoomById(room.rooms[i].id)
        if (r)
        {
            var p = r.isWaiting(name)
            if (p) // le joueur est inscrit dans cette room
            {
                return r.id
            }
        }
    }
    return null
}

/*
    Retourne true si le joueur est enregistré dans une room
*/
function hasJoinedRoom(name)
{
    return getJoinedRoom(name) != null
}

exports.Player = Player
exports.ConnectionStatus = ConnectionStatus
exports.getCurrentRoom = getCurrentRoom
exports.isPlaying = isPlaying
exports.getJoinedRoom = getJoinedRoom
exports.hasJoinedRoom = hasJoinedRoom
