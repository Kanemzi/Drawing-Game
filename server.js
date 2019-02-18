var express = require('express')
var session = require('express-session')
var bodyParser = require('body-parser')
var notifications = require('./controllers/notification')
var env = require('./.env')

var app = express()
var server = require('http').createServer(app)
global.io = require('socket.io')(server)

var room = require('./controllers/game/room')
/* ********TODO : remove **************/
global.debug = function(str)
{
    console.log(str)
}
/* ************************ */
app.use( bodyParser.urlencoded( { extended: false } ))

app.use( session( {
  secret : 'C3sT-l0pt1-BoGHUm-FHSHUCSS',
  resave : false,
  saveUninitialized : true,
  cookie: { secure : false }
}))

var db = require('./db')
db.connect()

app.use(express.static('public'))

app.use( function(req, res, next) {
    notifications.get(req, res)
    next()
})

app.get('/', function(req, res) {
    require('./controllers/home').load(req, res)
})

app.post('/login', function(req, res) {
    require('./controllers/login').login(req, res)
})

app.get('/logout', function(req, res) {
   require('./controllers/login').logout(req, res)
})

app.post('/register', function(req, res) {
    require('./controllers/register').register(req, res)
})



app.post('/account/:action', function(req, res) {
   require('./controllers/account').action(req.params.action, req, res)
})

app.get('/account', function(req, res) {
    require('./controllers/account').load(req, res)
})


app.get('/room/:roomnum',function(req, res) {
    require('./controllers/room').join(req, res)
})


app.use(function(req, res, next) {
    res.render('404.ejs')
})

io.on('connection', function(socket) {

    var room_token = socket.handshake.query.room

    if( !room_token )
    {
        socket.emit('room_join_error')
        return
    }

    var r = room.getRoomById(room_token)

    if (r)
    {
        r.addPlayer(socket)

        socket.on('disconnect', function() {

            r.startConnectionTimeout(socket)
        })

        socket.on('connect_failed', function() {

        })

        socket.on('reconnect', function() {

        })

        socket.on('reconnect_failed', function() {

        })
    }
})


server.listen(env.SERVER_PORT)

console.log('[Server] listening on port', env.SERVER_PORT)
