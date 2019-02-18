var start_button = $('#start_game')

if (start_button)
{
    //TODO : à faire dans le css
    start_button.attr('disabled', true)
    
    start_button.click(function()
    {
        socket.emit('state_question_answer', {id : 'start_game'})
    })
    
    socket.on('enable_starting', function(data)
    {
        start_button.attr('disabled', false)
    })
}