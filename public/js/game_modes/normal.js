var start_button = $('#start_game')

if (start_button)
{
    
    start_button.attr('disabled', true)

    start_button.click(function()
    {
        socket.emit('state_question_answer', {id : 'start_game'})
        start_button.slideUp(100, () => {})
    })

    socket.on('current_word', function(word)
    {
        
        $('#info1').html(word.split('!').join('<pre style="display: inline"> </pre>'))
    })

    socket.on('points_variation', function(new_points)
    {
        $('#info2').text(new_points)
    })
    
    socket.on('score_variation', function(new_score)
    {
        $('#p_' + new_score.player + ' .user_party .user_score').text(new_score.value + ' pts')    
    })

    socket.on('chrono', function(time)
    {
        $('#info3').text(time)
    })
    
    // {name, state : [true|false]}
    socket.on('set_drawer', function(player) {
        if (player.state == true) {
            $('#p_' + player.name).addClass('drawer')
        } else {
            $('#p_' + player.name).removeClass('drawer')
        }
    })
    
    // {name, state : [true|false]}
    socket.on('set_guessed', function(player) {
        if (player.state == true) {
            $('#p_' + player.name).addClass('guessed')
        } else {
            $('#p_' + player.name).removeClass('guessed')
        }
    })
}
