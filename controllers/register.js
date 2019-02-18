var crypto = require('crypto')
var htmlentities = require('html-entities').XmlEntities

var model = require('../models/register')
var notifs = require('./notification')

exports.register = function(req, res)
{
    var pseudo = req.body.pseudo
    var password = req.body.password
    var passwordConfirm = req.body.password_confirm

    // Vérification des erreurs possible

    var regex = /^[a-zA-Z0-9_-]{3,16}$/

    if (!pseudo || !password || !passwordConfirm)
    {
        notifs.add(req, notifs.types.ERROR, 'Le formulaire d\'inscription n\'est pas valide')
    }

    if (!regex.test(pseudo))
    {
        notifs.add(req, notifs.types.ERROR, 'Le pseudo comporte des caractères incorrect')
    }

    if (pseudo.length == 0)
    {
        notifs.add(req, notifs.types.ERROR, 'Le pseudo est vide')
    }

    if (pseudo.length > 16)
    {
        notifs.add(req, notifs.types.ERROR, 'Votre pseudo doit comporter moins de 16 caractères')
    }

    if (password.length < 4)
    {
        notifs.add(req, notifs.types.ERROR, 'Votre mot de passe doit comporter au moins 4 caractères')
    }

    if (password != passwordConfirm)
    {
        notifs.add(req, notifs.types.ERROR, 'Les deux mots de passe ne correspondent pas')
    }

    model.checkUserExists(pseudo, (exists) => {

        if (!exists)
        {
            if ( notifs.empty(req) )
            {
                var user = {
                    pseudo : htmlentities.encode(pseudo),
                    hash : crypto.createHash('sha256').update(password).digest('base64'),
                    flag : 'joueur',
                    score : 0
                }

                model.createUser(user, () => {
                    console.log('[New account] \'', user.pseudo, '\' created' )
                    notifs.add(req, notifs.types.SUCCESS, 'Le compte ' + user.pseudo + ' a été créé !')
                    res.redirect('/')
                })
            }
            else
            {
                res.redirect('/')
            }
        }
        else
        {
            notifs.add(req, notifs.types.ERROR, 'Ce pseudo est déjà utilisé')
            res.redirect('/')
        }
    })
}
