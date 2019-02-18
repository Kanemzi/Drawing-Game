var db = require('../db')

exports.checkValidLogin = function(pseudo, hash, callback)
{
    db.query('SELECT pseudo FROM users WHERE pseudo=? AND pass=?', [pseudo, hash], (result, fields) => {
        callback(result.length > 0)
    })
}

exports.updateLastConnection = function(pseudo, callback)
{
    db.query('UPDATE users SET date_last_connection = now() WHERE pseudo=?', [pseudo], (result, fields) => {
        callback()
    })
}
