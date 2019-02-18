var db = require('../db')

exports.getUserData = function(pseudo, callback) {
    db.query('SELECT xp,level,thune,nb_play,nb_win,users.pseudo FROM users,stats WHERE users.pseudo=? AND users.pseudo=stats.pseudo', [pseudo], function(result, fields) {
        callback(result, fields)
    })
}

exports.getUserPassword = function(pseudo, callback) {
    db.query('SELECT pass FROM users WHERE pseudo=?', [pseudo], function(result, fields) {
        callback(result, fields)
    })
}

exports.postNewPass = function(pseudo, pass, callback) {
    db.query('UPDATE users SET pass =? WHERE pseudo =?', [pass, pseudo], function(result, fields) {
        callback(result, fields)
    })
}