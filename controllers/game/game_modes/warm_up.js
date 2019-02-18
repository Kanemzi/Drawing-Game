/* * * * * * * * * * * * * * SETUP * * * * * * * * * * * */

var gm = require('../game_mode')

function WarmUp(room)
{
    gm.GameController.call(this, room, this) // appel au constructeur de GC
    this.allowPlayerJoin = true // autorise les joueurs à rejoindre durant le warm up
}
gm.extendGC(WarmUp) // héritage


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
    Crée et initialise les fonctions du sélecteur
*/
WarmUp.prototype.createSelector = function()
{
    var s = new gm.PlayerSelector(this)

    s.ALL = this.room.players
    s.OWNER = [this.roomOwner]

    /*
        Mise à jour des tableaux
    */
    s.update = function()
    { 
        this.OWNER = [this.gc.room.getPlayerByName(this.gc.room.owner)] 
        this.ALL = this.gc.room.players
    }

    this.setSelector(s)
}

/*
    Initialise les données de jeu destinées au joueur
*/
WarmUp.prototype.createPlayerData = function()
{
    this.playerData = {

    }
}

/*
    Initialise les états de partie
*/
WarmUp.prototype.createGameStates = function()
{
    this.addState("gsWarmUp", new gm.GameState(this,

        function onStart()
        {
            this.gc.selector.update()
            
            this.count = 3
            
            this.starting = false
            
            this.gc.sendConfigQuestion()
        },

        function onEnd()
        {
        },

        function onChatMessage(player, message)
        {
            if(!this.gc.antiflood.checkMessage(player, this.gc)) return
            
            var t = this
            if (message.data.text.startsWith('/ct'))
            {
                this.gc.broadcastMessage(this.gc.createStateIndication('Message de test n°' + Math.round(Math.random() * 1000), 2, false))
            }
            else if (message.data.text.startsWith('/cx'))
            {
                this.gc.broadcastMessage(this.gc.createStateQuestion('alo', 'Alo ? ' + Math.round(Math.random() * 1000), 20, false, ['oui', 'alo', 'bonjour', 'non']))
            }
            else if (message.data.text.startsWith('/aa'))
            {
                this.gc.transmitMessage(this.gc.selector.ALL, this.gc.createStateQuestion('admin', 'Question de config' + Math.round(Math.random() * 1000), 20, false, ['1', '2', '3', '4']))
            }
            else if (message.data.text.startsWith('/st'))
            {
                // lancer un countdown de test
            }
            else
            {
                this.gc.broadcastMessage(message)
                this.gc.saveChatMessage(message, gm.room.MAIN_CHANNEL)
            }
            
        },

        function onCanvasMessage(player, message)
        {
            if (message.type == 'canvas_clear') return
            
            this.gc.broadcastMessage(message)
            this.gc.saveCanvasMessage(message, gm.room.MAIN_CHANNEL)
        },

        function onControlMessage(player, message)
        {
            var configParams = this.gc.configParams
            var gs = this
            var gc = this.gc
            var config = gc.room.Controller.config
            
            if (gc.selector.isIn(player, gc.selector.OWNER)) // si l'owner répond à une question
            {
                // lancement de la partie
                if (message.data.id == 'start_game')
                {
                    if (!this.starting && gc.configDone)
                    {
                        this.starting = true
                        this.count = 3
                        
                        this.cd = setInterval( function countdown()
                        {
                            gc.broadcastMessage(gc.createStateIndication(gs.count , 0 + (gs.count == 0) * 1 , false))
                            if (gs.count-- <= 0) {
                                clearInterval(gs.cd)
                                gc.room.start()
                            }
                            return countdown
                        }(), 1000)
                    }
                } else
                // vérification des données
                if (!gc.configDdone && message.data.ans >= 0 && message.data.ans < configParams.setup[gc.configCount].ans.length) // réponse correct
                {
                    if (configParams.id[message.data.id] != undefined && configParams.id[message.data.id] == gc.configCount) // le paramètre est correct
                    {
                        clearInterval(gc.configInterval)
                        
                        if (gc.configCount < gc.configNumber)
                        {
                            config[message.data.id] = configParams.setup[gc.configCount].ans[message.data.ans]

                            gc.broadcastMessage(gm.chat.colorize(gc.createChatMessage(message.data.id + ' a été paramétré à ' + config[message.data.id]), '#007733'))
                            
                            gc.configCount++

                            if (gc.configCount < gc.configNumber)
                            {
                                setTimeout(function() {
                                    gc.sendConfigQuestion()
                                }, 500)
                            }
                            else
                            {
                                gc.configDone = true
                                gc.transmitMessage(gc.selector.OWNER, {type: 'enable_starting'})
                            }        
                        }        
                    
                    } else {debug('[WarmUp] Paramètre "' + message.data.id + '" incorrect')}
                }
                else {debug('[WarmUp] Valeur de paramètre incorrecte')}
            }
        },

        function onTimeoutEnd()
        {

        }
    ))
}







WarmUp.prototype.onInit = function()
{
    this.createSelector()
    this.createPlayerData()
    this.createGameStates()

    debug('[WarmUp] initialized')
}

WarmUp.prototype.onStart = function()
{
    debug('[WarmUp] started')
    
    // récupération des questions de config du mode de jeu de la room
    this.configParams = this.room.Controller.configParams
    
    this.ownerDisconnected = false
    
    this.configNumber = this.configParams.setup.length // nombre de paramètres de configuration
    this.configCount = 0
    this.configDone = false
    
    this.roomOwner = this.room.getPlayerByName(this.room.owner)
    
    this.setState("gsWarmUp")
}

WarmUp.prototype.onEnd = function()
{
    debug('[WarmUp] ended')
    this.clearCanvasHistory(gm.room.MAIN_CHANNEL)
    this.broadcastMessage(this.createClearMessage('#fff'))
    this.broadcastMessage(this.createChatMessage('Fin du warm up !'))
}

WarmUp.prototype.onClose = function()
{
    this.clearCanvasHistory(gm.room.MAIN_CHANNEL)
    debug('[WarmUp] closed')
}


/*
    Quand un joueur se reconnecte, mettre à jour le selecteur
*/
WarmUp.prototype.onJoin = function(player)
{
    if (this.selector.isIn(player, this.selector.OWNER) && this.configDone)
    {
        this.transmitMessage(this.selector.OWNER, {type: 'enable_starting'})
    }
}



// Fonction de haut niveau

WarmUp.prototype.sendConfigQuestion = function()
{
    var gc = this
    var question = this.configParams.setup[this.configCount]
    this.transmitMessage(this.selector.OWNER, this.prepareStateQuestion(question))
    
    // Renvoi de la question si l'owner ne répond pas (en cas de déco-reco)
    clearInterval(this.configInterval)
    this.configInterval = setInterval(function()
    {
        gc.sendConfigQuestion()
    }, 2000)
}



module.exports = WarmUp
