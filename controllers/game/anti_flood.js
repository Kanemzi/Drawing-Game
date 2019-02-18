var gm = require('./game_mode')

function AntiFlood() {
    
    this.tab = {}
    
    
    this.checkMessage = function(joueur, gc){
        
        let name = joueur.name
        
        if(this.tab[name] === undefined ){
            this.tab[name] = 1
            return true
        } else {
            
            if(this.tab[name] < 8) this.tab[name]++
            
            if (this.tab[name] < 3) {
                return true
            }
            else {
                let error = gc.createChatMessage('[Server] vous envoyez trop de messages.')
                error = gm.chat.colorize(error, '#ff0000')
                gc.transmitMessage([joueur], error)
                return false
            }
        }
    }
    
    this.interval = setInterval(() => {
        for(var name in this.tab) {
            if(this.tab[name]>0){
                this.tab[name]--
            }
        }
    }, 2000)
    
    this.close = function(){
        clearInterval(this.interval);
    }
}

exports.AntiFlood = AntiFlood
