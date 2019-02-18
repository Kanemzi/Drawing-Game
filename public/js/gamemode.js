/*
    Gestion de base des game modes
    La gestion en détail de chaque game mode est décrite dans le dossier game_modes
    (1 fichier par GameMode)
*/

var sld = false // state layer displayed
var slt // state layer timeout
var qid // question id

var state_layer = $('#state_layer')

socket.on('state_new_indication', function(data)
{
    if (slt) clearTimeout(slt)
    
    if (data.close)
    {
        hideStateLayer()
    }
    else
    {
        
        qid = data.id
        
        displayStateLayer(data.text, data.ans)
        if (data.timeout > 0)
        {
            slt = setTimeout(hideStateLayer, data.timeout * 1000)
        }
    }
})

/*
    Affiche le state layer avec un texte et des réponses possibles
    Si un message est déjà affiché, il est écrasé par le nouveau message
    text : le texte à afficher
    ans : tableau des réponses possibles 
*/
function displayStateLayer(text, ans)
{
    var content = '<div id="state_message"><div id="state_mcontent">' 
                + '<p>' + text + '</p></div>'
	
    if (ans)
    {
        content += '<div id="state_choice"><ul>'
        
        for (var i = 0; i < ans.length; i++)
	    {
	        content += '<li class="state_ans" id="ans' + i + '" >' + ans[i] + '</li>'
	    }
	    
	    content += '</ul></div>'
    }
    
    content += '</div>'
    
    state_layer.html(content)

    state_layer.fadeIn(100)
    
    $('.state_ans').click(function()
    {
        var ans = $(this).attr('id')
        socket.emit('state_question_answer', {id : qid, ans : ans.substring(3, ans.length) })
        hideStateLayer()
    })

    sld = true
}

/*
    cache le layer d'indication d'état et le vide
*/
function hideStateLayer()
{
    $('.state_ans').unbind('click')

    state_layer.fadeOut(100, function() {
        state_layer.html('')
    })
    
    sld = false
}