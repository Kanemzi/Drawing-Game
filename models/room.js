var db = require('../db')

exports.AddXp = function(xp, pseudo, callback)
{
    db.query('UPDATE stats SET xp = xp + ? WHERE pseudo=?', [xp, pseudo], (result, fields) => {
        
        CalculerLevel(pseudo, () =>{
            callback()
        })
        
    })
}

exports.AddThune = function(thune, pseudo, callback)
{
    db.query('UPDATE stats SET thune = thune + ? WHERE pseudo=?', [thune, pseudo], (result, fields) => {
        callback()
    })
}

exports.GetThune = function(pseudo, callback)
{
    db.query('Select thune from stats WHERE pseudo=?', [pseudo], (result, fields) => {
        callback(result[0].thune)
    })
}

exports.IncGamePlayed = function(pseudo, callback)
{
    db.query('UPDATE stats SET nb_play = nb_play + 1 WHERE pseudo=?', [pseudo], (result, fields) => {
        callback()
    })
}

exports.GetGamePlayed = function(pseudo, callback)
{
    db.query('Select nb_play from stats WHERE pseudo=?', [pseudo], (result, fields) => {
        callback(result[0].nb_play)
    })
}

exports.IncGameWin = function(pseudo, callback)
{
    db.query('UPDATE stats SET nb_win = nb_win + 1 WHERE pseudo=?', [pseudo], (result, fields) => {
        callback()
    })
}

exports.GetGameWin = function(pseudo, callback)
{
    db.query('Select nb_win from stats WHERE pseudo=?', [pseudo], (result, fields) => {
        callback(result[0].nb_win)
    })
}

var IncLevel = function(pseudo, callback)
{
    db.query('UPDATE stats SET level = level + 1 WHERE pseudo=?', [pseudo], (result, fields) => {
        callback()
    })
}

exports.IncLevel = IncLevel;

var GetXp = function(pseudo, callback)
{
    db.query('Select xp from stats WHERE pseudo=?', [pseudo], (result, fields) => {
        callback(result[0].xp)
    })
}

exports.GetXp = GetXp;

var GetLevel = function(pseudo, callback)
{
    db.query('Select level from stats WHERE pseudo=?', [pseudo], (result, fields) => {
        callback(result[0].level)
    })
}

exports.GetLevel = GetLevel;

var CalculerLevel = function(pseudo, callback)
{
    GetXp(pseudo, (xp) => {
        
        GetLevel(pseudo, (level) => {
        
            var xpAtt = Math.ceil( -0.2158411 + 48.33635*(level+1) + 29.13409 * Math.pow((level+1),2) - 2.345588 * Math.pow((level+1),3) + 0.1559248 * Math.pow((level+1),4) - 0.00002920985 * Math.pow((level+1),5))
            
            if(xp>xpAtt){
                
                IncLevel(pseudo, ()=> {
                    callback();
                })
                
            } else {
                callback()
            }
        
        });
        
        
    });
}