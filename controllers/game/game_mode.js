
var chat = require('./chat')
var room = require('./room')
var player = require('./player')
var dico = require('./../../models/dictionary')
var stats = require('./../../models/room')
var antiflood = require('./anti_flood')

/*
    Constructeur de GameController
    room : la room associée au controller
    child : l'instance de la classe fille crée
*/
function GameController(room, child)
{
    this.room = room
    this.child = child

	this.started = false
	
    this.selector = null
    this.states = []
    this.playerData = null // pack de données en rapport avec la partie fournies au joueur (ex: score, bonus, isDrawing etc...)

    this.state = null

    this.config = {}

    this.playerCount = 0 // le nombre de joueurs dans la room (seulement après, le warmup)
    
    this.antiflood=null

}

/*
    Lance l'initialisation du GC
*/
GameController.prototype.init = function()
{
	this.child.onInit()
}


/*
	Démarre la partie
*/
GameController.prototype.start = function()
{
	if (!this.started)
	{
		this.started = true

		for (var i = 0; i < this.room.players.length; i++)
		{
			this.room.players[i].gameData = Object.assign({}, this.playerData)
		}

		this.child.onStart()
		
		this.antiflood=new antiflood.AntiFlood();

		debug("Game Controller Started")
	}

}

GameController.prototype.join = function(player)
{
	this.onJoin(player)
	
	if (this.state && this.state.onJoin)
		this.state.onJoin(player)
}

/*
	Arrête le GameController
*/
GameController.prototype.end = function()
{
	if (this.started)
	{
		this.room.ended = true
		
		if (this.state)
		{
			this.state.end() // ferme l'état actuel
		}

		this.child.onEnd()
		
		this.antiflood.close();
	}
}

/*
	Ferme le GameController (en cas de fermeture de la room)
*/
GameController.prototype.close = function()
{
	/*for (var i = 0; i < this.room.players.length; i++)
	{
		delete this.room.players[i].gameData
	}*/
	this.room.close()
	this.child.onClose()
}

/*
    Ajoute un nouvel état au controller
*/
GameController.prototype.addState = function(name, state)
{
    state.gc = this
    state.name = name
    this.states.push({name : name, state : state})
}

/*
    Modifie l'état actuel du jeu
*/
GameController.prototype.setState = function(name, maxTime = 0)
{
    var newState = this.states.find(function(s)
    {
        return s.name == name
    }).state

    if (newState) // l'état a été trouvé
    {
        if (this.state) this.state.end() // ferme l'ancien état

        if (maxTime > 0) newState.setMaxTime(maxTime)

        this.state = newState
        this.state.start() // lance le nouvel état
    }
}

/*
    Ajoute un sélecteur au gc
*/
GameController.prototype.setSelector = function(selector)
{
    this.selector = selector
}

/*
    Envoie un message aux joueurs du tableau [players]
*/
GameController.prototype.transmitMessage = function(players, message)
{
	if (!this.started) return

    var len = players.length
    for(var i = 0; i < len; i++)
    {
        players[i].socket.emit(message.type, message.data)
    }
}

/*
    Transmet un message à tous les joueurs de la room
*/
GameController.prototype.broadcastMessage = function(message)
{
	if(!this.started) return

    this.selector.getAllSocketsInRoom().emit(message.type, message.data)
}


/*
	Crée un nouveau channel de discussion
*/
GameController.prototype.createChannel = function(channel)
{
	this.room.messages_history[channel] = []
}

/*
	Crée un nouveau canvas
*/
GameController.prototype.createCanvas = function(canvas)
{
	this.room.canvas_history[canvas] = []
}

/*
	Retourne true si le channel existe
*/
GameController.prototype.channelExists = function(channel)
{
	return (this.room.messages_history[channel] !== undefined)
}

/*
	Retourne true si le canvas existe
*/
GameController.prototype.canvasExists = function(canvas)
{
	return (this.room.canvas_history[canvas] !== undefined)
}

/*
	Retourne le nombre de messages d'un channel
*/
GameController.prototype.channelSize = function(channel)
{
	if (this.channelExists(channel))
		return this.room.messages_history[channel].length
}

/*
	Retourne le nombre de messages d'un canvas
*/
GameController.prototype.canvasSize = function(canvas)
{
	if (this.channelExists(canvas))
		return this.room.canvas_history[canvas].length
}

/*
	Sauvegarde un message de chat dans la room, dans un channel
*/
GameController.prototype.saveChatMessage = function(message, channel)
{
	if(this.channelExists(channel))
		this.room.messages_history[channel].push(message.data)
}

/*
	Sauvegarde un message de canvas dans la room, dans un canvas particulier
*/
GameController.prototype.saveCanvasMessage = function(message, canvas)
{
	if(this.canvasExists(canvas))
		this.room.canvas_history[canvas].push(message)
}

/*
	retourne le message n° [id] du channel indiqué
*/
GameController.prototype.loadChatMessage = function(channel, id)
{
	if(this.channelExists(channel))
		return this.room.messages_history[channel][id]
}

/*
	retourne le message n° [id] du canvas indiqué
*/
GameController.prototype.loadCanvasMessage = function(canvas, id)
{
	if(this.canvasExists(canvas))
		return this.room.canvas_history[canvas][id]
}

/*
	supprime l'historique des messages dans un channel
*/
GameController.prototype.clearChannelHistory = function(channel)
{
	if(this.channelExists(channel))
		this.room.messages_history[channel] = []
}

/*
	supprime l'historique de dessin d'un canvas
*/
GameController.prototype.clearCanvasHistory = function(canvas)
{
	if(this.canvasExists(canvas))
		this.room.canvas_history[canvas] = []
}

/*
	retourne un message provenant du serveur
*/
GameController.prototype.createChatMessage = function(text)
{
	return {type: 'chat_new_message', data: {fromServer : true, text : text} }
}

/*
	retourne une indication sur l'état du jeu

	Une indication d'état est affiché en grand sur un bandeau au milieu de l'écran de
	l'utilisateur.

	text : est le texte à afficher sur le message
	timeout : si == 0, le message attend un second message de close pour se fermer (ou un nouveau message)
			sinon, le message se fermera chez le client au bout de [timeout] secondes

	close : si close == true, envoie un message de fermeture (les autres paramètres sont ignorés)
			sinon envoie un message contenant le text indiqué

*/
GameController.prototype.createStateIndication = function(text, timeout, close)
{
	return {type : 'state_new_indication', data : { text : text, timeout : timeout, close : close} }
}

/*
	retourne un message indiquant au client de nettoyer son canvas avec la couleur [color]
*/
GameController.prototype.createClearMessage = function(color)
{
	 return {type : 'canvas_clear', data : { color: color} }
}
/*
	retourne une question d'état

	Une question d'état est une question à choix destinée aux joueurs

	/!\ N'importe qui peut envoyer une réponse à une question même si il ne l'a pas reçue
	C'est au créateur de GameMode de vérifier qui a retourné une réponse

	text : est le texte à afficher sur le message
	timeout : si == 0, le message attend un second message de close pour se fermer (ou un nouveau message)
			sinon, le message se fermera chez le client au bout de [timeout] secondes

	close : si close == true, envoie un message de fermeture (les autres paramètres sont ignorés)
			sinon envoie un message contenant le text indiqué

	ans : tableau des réponses possibles. La réponse retournée par l'utilisateur sera l'index de la réponse dans le tableau (afin d'éviter la triche)
*/
GameController.prototype.createStateQuestion = function(id, text, timeout, close, ans)
{
	return {type : 'state_new_indication', data : { id: id, text : text, timeout : timeout, close : close, ans : ans} }
}

/*
	rend une question prête à être envoyée
*/
GameController.prototype.prepareStateQuestion = function(question)
{
	return {type : 'state_new_indication', data : question }
}

// Initialisation des composants du GameController (playerData, states etc...)
GameController.prototype.onInit = function() { }

// Lançement de la partie
GameController.prototype.onStart = function() { }

// Fin de la partie (envoie scores)
GameController.prototype.onEnd = function() { }

// Fermeture du GameController (arrêt forcé de la room)
GameController.prototype.onClose = function() { }

// Lors du re-join d'un joueur dans la game ( [player] : le joueur qui se connecte)
GameController.prototype.onJoin = function(player) { }







/*
    Constructeur de GameState
    gc : le controller associé à l'état
    onStart : fonction appelée au lancement de l'état
    onEnd : fonction appelée à la fermeture de l'état
    onChatMessage : fonction appelée lors de la réception d'un message dans le chat
    onCanvasMessage : fonction appelée lors de la réception d'un message dans le canvas
    onControlMessage : fonction appelée lors de la réception d'un message de contrôle de partie
    onTimeoutEnd : fonction appelée lorsque l'état a duré trop longtemps et n'est pas terminé
*/
function GameState(gc, onStart, onEnd, onChatMessage, onCanvasMessage, onControlMessage, onTimeoutEnd)
{
    this.gc = gc
    this.onStart = onStart
    this.onEnd = onEnd
    this.onChatMessage = onChatMessage
    this.onCanvasMessage = onCanvasMessage
    this.onControlMessage = onControlMessage
    this.onTimeoutEnd = onTimeoutEnd

    this.maxTime = 0
    this.timeout = null
}

/*
	Lance le GameState
*/
GameState.prototype.start = function()
{
	this.onStart()
	if (this.maxTime > 0)
	{
        var gs = this

        this.timeout = setTimeout(
            () => { gs.onTimeoutEnd() },
            this.maxTime * 1000
        )
	}
}

/*
	Ferme le GameState
*/
GameState.prototype.end = function()
{
	this.onEnd()
	if (this.maxTime > 0)
	{
		clearTimeout(this.timeout)
	}
}

/*
	Définit la durée max de l'état (en secondes)
*/
GameState.prototype.setMaxTime = function(maxTime)
{
	this.maxTime = maxTime
}










/*
    Constructeur d'un selecteur de joueur
    gc : controller associé au sélecteur
*/
function PlayerSelector(gc)
{
    this.gc = gc
}

/*
    Retourne true si le joueur [player] se trouve dans le tableau de joueurs [players]
*/
PlayerSelector.prototype.isIn = function(player, players)
{
    return players.indexOf(player) != -1
}

/*
    Retourne les sockets de tous les joueurs se trouvant dans la room associée au gc du selecteur
    (sert d'optimisation pour broadcast des messages)
*/
PlayerSelector.prototype.getAllSocketsInRoom = function()
{
    return io.in(this.gc.room.id)
}










function extendGC(subGC)
{
    subGC.prototype = Object.create(GameController.prototype)
}


exports.GameController = GameController
exports.GameState = GameState
exports.PlayerSelector = PlayerSelector
exports.extendGC = extendGC

exports.chat = chat
exports.room = room
exports.player = player
exports.dico = dico
exports.stats = stats

exports.gcs = {} // game controllers list

var WarmUp = require('./game_modes/warm_up')
var Normal = require('./game_modes/normal')

var GameMode = {
    NORMAL : {name: "Normal", controller : Normal},
    DUAL : {name: "Duel", controller: null},
    BLIND : {name: "Aveugle", controller: null}
}

exports.GameMode = GameMode

exports.gcs.WarmUp = WarmUp
exports.gcs.Normal = Normal
