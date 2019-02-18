var types = {
    ERROR: 0,
    INFO: 1,
    SUCCESS: 2
}

/*
    Constructeur de notification
*/
function Notification(type, text)
{
    this.type = type
    this.text = text
}

/*
    Ajoute une notification, dans la liste des notifications de l'utilisateur
*/
function add(req, type, text)
{
    if (! req.session.notifications)
        req.session.notifications = []

    req.session.notifications.push(new Notification(type, text))
}

/*
    Envoie une notification par socket (l'utilisateur doit être dans une room)
*/
function send(socket, type, text)
{
    if (! socket)
        return

    socket.emit('new_notification', {type : type, text : text})
}

/*
    Retourne l'ensemble des notifications associées à la personne ayant fait la requête et les supprime
*/
function get(req, res)
{
    if(! req.session.notifications)
    {
        clear(req)
    }

    var n = []

    for (var i = 0 ; i < req.session.notifications.length; i++)
        n[i] = req.session.notifications[i]

    res.locals.notifications = n
    clear(req)
    return n
}

/*
    retourne true si la liste des notifications stockées dans la variable de session est vide
*/
function empty(req)
{
    return req.session.notifications.length == 0
}

/*
    Supprime toutes les notifications de l'utilisateur qui a fait la requete
*/
function clear(req)
{
    req.session.notifications = []
}

exports.add = add
exports.send = send
exports.types = types
exports.empty = empty
exports.clear = clear
exports.get = get
