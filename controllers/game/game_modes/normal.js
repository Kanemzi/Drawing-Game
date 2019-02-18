/* * * * * * * * * * * * * * SETUP * * * * * * * * * * * */

var gm = require('../game_mode')

function Normal(room)
{
    gm.GameController.call(this, room, this) // appel au constructeur de GC
    this.allowPlayerJoin = false // autorise les joueurs à rejoindre durant le warm up

    this.drawer = null // le joueur qui dessine

    this.roundNumber = 0 // le numéro du round actuel

    this.roundOrder = [] // l'ordre de passage des joueurs dans le round
}
gm.extendGC(Normal) // héritage

Normal.prototype.configParams =
{
    setup :
    [
        { id: 'roundCount', text : 'Combien de rounds ?', timeout : 0, close : false, ans : ['1', '2', '3', '4', '5', '6'] },
        { id: 'drawingTime', text : 'Quel temps de dessin ? (en secondes)', timeout : 0, close : false, ans : ['10', '20', '30', '40', '50', '60'] }
    ],

    id :
    {
        roundCount: 0,
        drawingTime: 1
    },
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*
    Crée et initialise les fonctions du sélecteur
*/
Normal.prototype.createSelector = function()
{
    var s = new gm.PlayerSelector(this)

    s.ALL = this.room.players

    s.DRAWER = []
    s.NOT_DRAWER = this.room.players
    
    s.GUESSED = []

    s.updateDRAWER = function()
    {
        this.DRAWER = [this.gc.playerOrder[this.gc.playerIndex]]
        this.DRAWER[0].drawer = true
        this.DRAWER[0].guessed = true

        this.NOT_DRAWER = []
        for (var i = 0 ; i < this.gc.playerCount ; i++)
        {
            var p = this.gc.playerOrder[i]

            if (p.name != this.DRAWER[0].name)
            {
                p.drawer = false
                this.NOT_DRAWER.push(p)
            }
        }
    }
    
    s.updateGUESSED = function() {
        this.GUESSED = []
        
        for (var i = 0; i < this.gc.playerCount ; i++) {
            var p = this.gc.playerOrder[i]
            
            if(p.guessed)
                this.GUESSED.push(p)
        }
    }

    this.setSelector(s)
}

/*
    Initialise les données de jeu destinées au joueur
*/
Normal.prototype.createPlayerData = function()
{
    this.playerData =
    {
        score: 0, // score du joueur

        drawer: false, // le joueur doit dessiner
        guessed: false, // le joueur a deviné le mot

    }
}

/*
    Initialise les états de partie
*/
Normal.prototype.createGameStates = function()
{
    /*
        Initialisation des rounds
    */
    this.addState('gsRoundStart', new gm.GameState(this,

        function onStart()
        {
            var gc = this.gc

            // nombre de rounds atteint
            if (gc.roundNumber >= gc.config.roundCount)
            {
                gc.setState('gsGameEnd', 30)
            }
            else 
            {
                this.gc.playerIndex = 0
    
                this.t = setTimeout(function() {
                    gc.roundNumber ++
                    gc.broadcastMessage(gc.createStateIndication('Round ' + gc.roundNumber + ' !', 2, false))
                }, 1000)
            }
        },

        function onEnd()
        {
            if (this.t) clearTimeout(this.t)
        },

        function onChatMessage(player, message)
        {
            if(!this.gc.antiflood.checkMessage(player, this.gc)) return
            
            this.gc.broadcastMessage(message)
            this.gc.saveCanvasMessage(message, gm.room.MAIN_CHANNEL)
        },

        function onCanvasMessage(player, message)
        {
        },

        function onControlMessage(player, message)
        {
        },

        function onTimeoutEnd()
        {
            if (this.gc.room.ended) return
            
            debug('end timeout !!!!!!')
            this.gc.setState('gsWordChoice', 10)
        }
    ))








    /*
        Choix du mot
    */
    this.addState('gsWordChoice', new gm.GameState(this,

        function onStart()
        {
            var selector = this.gc.selector
            
            for (var i = 0; i < this.gc.playerCount; i++)
                selector.ALL[i].guessed = false
            
            debug("word choice")
            selector.updateDRAWER()
            selector.updateGUESSED()
            
            this.gc.setLocalStates()
            
            this.gc.playerIndex ++
            
            // choix des mots
            this.words = []
            gm.dico.GetWords(3, 0, 0, (words) => {
                
                this.gc.broadcastMessage(this.gc.createChatMessage('________________________________________________________________'))
                
                this.words = words
                this.chooseTimeLeft = 8
                this.gc.broadcastMessage({type: 'chrono', data: this.chooseTimeLeft + ' sec'})

                var question = [
                    
                    words[0].mot + '<br>(' + words[0].difficulty + ')',
                    words[1].mot + '<br>(' + words[1].difficulty + ')',
                    words[2].mot + '<br>(' + words[2].difficulty + ')'
                ]
                
                this.gc.transmitMessage(selector.DRAWER,
                    this.gc.createStateQuestion(
                        'wordChoice',
                        'Choisissez un mot',
                        8, false, question
                    )
                )
    
                this.gc.transmitMessage(selector.NOT_DRAWER,
                    this.gc.createStateIndication(
                        selector.DRAWER[0].name + ' est en train de choisir un mot ... ',
                        8, false
                    )
                )
                
                this.chooseTime = setInterval(() => {
                    if (this.chooseTimeLeft > 0) this.chooseTimeLeft--
                    this.gc.broadcastMessage({type: 'chrono', data: this.chooseTimeLeft + ' sec'})
                }, 1000)
                
            })
        },

        function onEnd()
        {
        },

        function onChatMessage(player, message)
        {
            if(!this.gc.antiflood.checkMessage(player, this.gc)) return
            
            if (player.drawer) return // le drawer ne peut pas envoyer d'informations à propos du mot
            
            this.gc.broadcastMessage(message)
            this.gc.saveChatMessage(message, gm.room.MAIN_CHANNEL)
        },

        function onCanvasMessage(player, message)
        {
        },

        function onControlMessage(player, message)
        {
            // choix du mot effectué
            if (this.gc.selector.isIn(player, this.gc.selector.DRAWER) && message.data.id == 'wordChoice')
            {
                if (message.data.ans < 3)
                {
                    this.gc.currentWord = this.words[message.data.ans].mot
                    this.gc.currentDiff = this.words[message.data.ans].difficulty

                    this.gc.broadcastMessage(this.gc.createStateIndication("", 0, true))

                    // lancement du dessin
                    clearInterval(this.chooseTime)
                    this.gc.setState('gsDrawing', this.gc.config.drawingTime)
                }
            }
        },

        function onTimeoutEnd()
        {
            clearInterval(this.chooseTime)
            
            // joueur peut être déco, passer à un autre joueur
            if (this.gc.playerIndex == this.gc.playerCount)
            {
                this.gc.setState('gsRoundStart', 4)
            }
            else
            {
                this.gc.setState('gsWordChoice', 10)
            }
        }
    ))









    /*
        Dessin du mot
    */
    this.addState('gsDrawing', new gm.GameState(this,

        function onStart()
        {
            this.onJoin = function(player)
            {
                var d = (player.drawer) ? this.gc.selector.DRAWER : this.gc.selector.NOT_DRAWER
                var w = (player.drawer) ? this.gc.currentWord : this.gc.state.hiddenWord
        
                this.gc.transmitMessage(d,
                    { type : 'current_word', data : w }
                )
        
                this.gc.transmitMessage([player], {type: 'points_variation', data:this.gc.currentDiff})
    
                this.gc.transmitMessage([player], {type: 'chrono', data: this.timeLeft + 'sec'})    
            }
            
            this.gc.broadcastMessage(this.gc.createStateIndication("", 0, true)) // supprimer le bandeau d'information sur les écrans des joueurs

            this.currentWord = this.gc.currentWord
            this.hiddenWord = '_ '.repeat(this.currentWord.length)
            for (var i = 0; i < this.currentWord.length; i++)
            {
                let c = this.currentWord.charAt(i)
                debug('char :' + c + ':')
                if (c == ' ' || c == '-' || c == '_' || c == '.') {
                    if (c == ' ') c = '!'
                    this.hiddenWord = this.hiddenWord.substr(0, i * 2) +
                                  c +
                                  this.hiddenWord.substr(i * 2 + 1)
                }
            }
            
            this.timeLeft = this.maxTime
            this.timeUp = false
            this.allFound = false
            this.endDraw = false

            // complétion auto du mot
            this.helpLevel = this.currentWord.length / 1.5 // aide pour 1/3 du mot au max
            this.helpChrono = setInterval( () => { if (this.helpLevel-- >= 0) this.completeWord() }, (this.maxTime / this.helpLevel) * 1000 )
            this.completeWord = function()
            {

                var letter
                do {
                    letter = Math.round(Math.random() * this.currentWord.length)
                } while (this.hiddenWord.charAt(letter * 2) == this.currentWord.charAt(letter))

                this.hiddenWord = this.hiddenWord.substr(0, letter * 2) +
                                this.currentWord.charAt(letter) +
                                this.hiddenWord.substr(letter * 2 + 1)
                this.gc.transmitMessage(this.gc.selector.NOT_DRAWER,
                    { type : 'current_word', data : this.hiddenWord }
                )
            }

            // diminution du temps restant
            this.chrono = setInterval(() => {
                this.timeLeft--
                this.gc.broadcastMessage({type: 'chrono', data: this.timeLeft + 'sec'})
                
                if (this.timeLeft < this.maxTime - 5 && this.gc.currentDiff > 20)
                {
                    this.gc.currentDiff -= 3
                    if (this.gc.currentDiff < 0) this.gc.currentDiff = 0
                    this.gc.broadcastMessage({type: 'points_variation', data:this.gc.currentDiff})
                }
            }, 1000)

            // envoi du mot aux joueurs (barres pour les joueurs ne dessinant pas)
            this.gc.transmitMessage(this.gc.selector.DRAWER,
                { type : 'current_word', data : this.gc.currentWord }
            )

            this.gc.transmitMessage(this.gc.selector.NOT_DRAWER,
                { type : 'current_word', data : this.hiddenWord }
            )
            
            this.gc.broadcastMessage({type: 'points_variation', data:this.gc.currentDiff})

            this.gc.broadcastMessage({type: 'chrono', data: this.timeLeft + 'sec'})
        },

        function onEnd()
        {
            clearInterval(this.chrono)
            clearInterval(this.helpChrono)
        },

        function onChatMessage(player, message)
        {
            if(!this.gc.antiflood.checkMessage(player, this.gc)) return
            
            if (this.timeUp) return

            if (player.drawer)
            {
                message = gm.chat.colorize(message, '#4477DD')
            }
            else if (player.guessed)
            {
                message = gm.chat.colorize(message, '#90a548')
            }
            else
            {
                if ( !this.endDraw && message.data.text.trim().toUpperCase() === this.gc.currentWord.toUpperCase())
                {
                    this.gc.broadcastMessage(this.gc.createChatMessage("[Server] " + player.name + " a deviné le mot !"))
                    player.guessed = true
                    
                    this.gc.selector.updateGUESSED()
                    
                    this.gc.setLocalStates()
                    
                    // calcul du nouveau score du joueur
                    let score = Math.floor(this.gc.currentDiff / 3)
                    let drawer = this.gc.selector.DRAWER[0]
                    
                    player.score += score
                    drawer.score += score
                    this.gc.currentDiff -= score
                    
                    
                    this.gc.broadcastMessage({type: 'points_variation', data:this.gc.currentDiff})
                    this.gc.broadcastMessage({type: 'score_variation', data: {player: player.name, value: player.score}})
                    this.gc.broadcastMessage({type: 'score_variation', data: {player: drawer.name, value: drawer.score}})
                    
                    // si tous les joueurs ont deviné le mot
                    if (this.gc.selector.GUESSED.length >= this.gc.playerCount) 
                    {
                        this.gc.broadcastMessage(
                            this.gc.createStateIndication(
                                ' <b> Tous les joueurs ont deviné le mot ! <b> <br> <sub>' + drawer.name + ' reçoit 40 banacoins !</sub>',
                                4, false
                            )
                        )
                        
                        // bonus de thune au drawer
                        if (this.gc.playerCount > 2)
                            gm.stats.AddThune(40, drawer.name, () => { debug('argent de ' + drawer.name + ' augmentée de ' + 40) } )
                        
                        this.allFound = true
                        this.onTimeoutEnd()
                    }
                    
                    return // ne pas envoyer le mot dans le chat
                }
            }
            
            if (player.drawer || player.guessed) {
                this.gc.transmitMessage(this.gc.selector.GUESSED, message)
            } else {
                this.gc.broadcastMessage(message)
                this.gc.saveChatMessage(message, gm.room.MAIN_CHANNEL)
            }
        },

        function onCanvasMessage(player, message)
        {
            if (player.drawer)
            {
                this.gc.broadcastMessage(message)
                this.gc.saveCanvasMessage(message, gm.room.MAIN_CHANNEL)
            }
        },

        function onControlMessage(player, message)
        {
        },

        function onTimeoutEnd()
        {
            // fin du temps de dessin
            
            if (this.endDraw) return
            
            this.endDraw = true
            
            if (!this.allFound)
                this.gc.broadcastMessage(this.gc.createStateIndication('<b>Temps écoulé !</b> <br> <sub> le mot à trouver était "' + this.gc.currentWord + '"</sub>', 4, false))
                
            clearInterval(this.chrono)
            clearInterval(this.helpChrono)
            
            setTimeout(() => {
                this.gc.broadcastMessage(this.gc.createClearMessage('#ffffff'))
                this.gc.clearCanvasHistory(gm.room.MAIN_CHANNEL)
                
                this.gc.setLocalStates()
                
                if (this.gc.playerIndex == this.gc.playerCount)
                {
                    
                    this.gc.setState('gsRoundStart', 4)
                }
                else
                {
                    this.gc.setState('gsWordChoice', 10)
                }
            }, 5000)
        }
    ))
    
    
    
    
    /*
        Fin de la partie, affichage du podium, attribution des points, sauvegarde des stats
    */
    this.addState('gsGameEnd', new gm.GameState(this,

        function onStart()
        {
            // tri des joueurs
            this.gc.selector.ALL.sort((a, b) => {
                return b.score - a.score
            })
            
            this.ranking = 'Podium'
            for (var i = 0; i < this.gc.playerCount; i++) {
                if (i < 3)
                    this.ranking += '<br>' + (i+1) + ' - ' + this.gc.selector.ALL[i].name + '  ' + this.gc.selector.ALL[i].score
            }
            
            for (var i = 0; i < this.gc.playerCount; i++)
                console.log(i + ' : ' + this.gc.selector.ALL[i].name + '  ' +this.gc.selector.ALL[i].score)
                
            this.gc.end()
        },

        function onEnd()
        {
            this.gc.broadcastMessage(this.gc.createStateIndication('Fin de la partie !', 20, false))
            this.showRanking = setInterval( () => {
                this.gc.broadcastMessage(this.gc.createStateIndication(this.ranking, 20, false))
            }, 2000)
            
            let allPlayers = this.gc.selector.ALL
            
            function giveThune(p, thune) {
                gm.stats.AddThune(thune,
                        p.name, () => { debug('argent de ' + p.name + ' augmentée de ' + thune) } )
            }
            
            for (var i = 0; i < this.gc.playerCount; i++) {
                let p = allPlayers[i]
                
                // il faut au moins 3 joueurs pour que les stats comptent
                if (this.gc.playerCount > 2) 
                {
                    
                    gm.stats.IncGamePlayed(p.name, () => {} )
                    
                    // attribution de bonus
                    switch(i) {
                        case 0:
                            giveThune(p, 100)
                            gm.stats.IncGameWin(p.name, () => {} )
                            break
                        case 1:
                            giveThune(p, 50)
                            break
                        case 2: 
                            giveThune(p, 25)
                            break
                    }
                    
                    giveThune(p, p.score)
                    
                    // xp = nb de points dans la game * 0.8
                    gm.stats.AddXp(Math.floor(p.score * 0.8),
                        p.name, () => { debug('xp de ' + p.name + ' augmentée de ' + p.score) } )
                        
                }
            }
        },

        function onChatMessage(player, message)
        {
            if(!this.gc.antiflood.checkMessage(player, this.gc)) return
            
            this.gc.broadcastMessage(message)
            this.gc.saveCanvasMessage(message, gm.room.MAIN_CHANNEL)
        },

        function onCanvasMessage(player, message)
        {
        },

        function onControlMessage(player, message)
        {
        },

        function onTimeoutEnd()
        {
            clearInterval(this.showRanking)
            this.gc.close()
        }
    ))
}







Normal.prototype.onInit = function()
{
    this.createSelector()
    this.createPlayerData()
    this.createGameStates()

    debug('[NormalMode] initialized')
}

Normal.prototype.onStart = function()
{
    debug('[NormalMode] started')

    this.broadcastMessage(this.createStateIndication('Le jeu commence !', 2, false))

    this.playerOrder = this.shufflePlayers() // Definir l'ordre des joueurs dans les rounds
    this.playerCount = this.playerOrder.length // nombre de joueurs dans la partie
    this.playerIndex = 0 // index du joueur actuel dans le round

    this.roundNumber = 0

    this.currentWord = '' // mot à faire deviner
    this.currentDiff = 0 // difficulté du mot actuel 

    this.selector.updateDRAWER()
    this.setState('gsRoundStart', 4)
    
    for (var i = 0; i < this.playerCount; i++) {
        let p = this.selector.ALL[i]
        p.score = 0
        p.guessed = false
        p.drawer = false
    }
}

Normal.prototype.onEnd = function()
{
    debug('[NormalMode] ended')
    this.clearCanvasHistory(gm.room.MAIN_CHANNEL)

    this.broadcastMessage(this.createClearMessage('#fff'))
}

Normal.prototype.onClose = function()
{
    this.clearCanvasHistory(gm.room.MAIN_CHANNEL)
    debug('[NormalMode] closed')
}

Normal.prototype.onJoin = function(player)
{
    this.setLocalStates()
}

/*
    Retourne un tableau des joueurs de la room mélangés
*/
Normal.prototype.shufflePlayers = function()
{
    var nbplayers = this.room.players.length
    var shuffled = this.room.players.slice(0)

    for (var i = 0; i < nbplayers; i++)
    {
        var r = Math.floor(Math.random() * nbplayers)
        var temp = shuffled[r]
        shuffled[r] = shuffled[i]
        shuffled[i] = temp
    }

    return shuffled
}

Normal.prototype.setLocalStates = function() {
    for (var i = 0; i < this.playerCount; i++) {
        let p = this.selector.ALL[i]
        this.broadcastMessage({type: 'set_guessed', data:{name: p.name, state : (p.guessed && !p.drawer) }})
        this.broadcastMessage({type: 'set_drawer', data:{name: p.name, state : p.drawer }})
        this.broadcastMessage({type: 'score_variation', data: {player: p.name, value: p.score}})
    }
}

module.exports = Normal
