var db = require('../db')

exports.checkUserExists = function(pseudo, callback)
{
    db.query('SELECT pseudo FROM users WHERE pseudo=?', [ pseudo ], (result, fields) => {
        callback(result.length > 0)
    })
}

exports.createUser = function(user, callback)
{
    db.query('INSERT INTO users (pseudo, pass, flag) VALUES ?', [[[ user.pseudo, user.hash, user.flag ]]], (result, fields) => {

        db.query('UPDATE users SET date_creation = now() WHERE pseudo=?', [user.pseudo], () => {

            db.query('INSERT INTO stats (pseudo) VALUES (?)', [user.pseudo], () => {
            callback()
            })

        })

    })
}
