var env = require('./.env')
var mysql = require('mysql')

var connection = mysql.createConnection( {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWD,
  database: env.DB_DATABASE
})

exports.get = function()
{
    return connection
}

exports.connect = function() {
    connection.connect( (err) => {
        if (err) console.log('[MySQL Error]', err)
        console.log('[Database] connected')
    })
}

exports.query = function(query, data, action)
{
    var q = mysql.format(query, data)

    connection.query(q, (err, result, fields) => {
        if (err) console.log('[MySQL Error]', err)
        if (action) action(result, fields)
    })
}
