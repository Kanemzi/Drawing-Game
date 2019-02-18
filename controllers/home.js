exports.load = function(req, res)
{
    if (req.session.user)
    {
        res.redirect('/account')
    }
    else
    {
        res.render('login.ejs')
    }
}
