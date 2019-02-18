var chat = $('.chat')

socket.on('chat_new_message', function(message) {

    console.log(message.color)

    if (!message.fromServer)
    {
        chat.append('													           \
        <div class="message" style="color: ' + (message.color || '#000') + ';">    \
    		<span class="sender">' + message.name + '</span>                       \
    		<span class="message_content">' + message.text + ' </span>             \
    	</div>																       \
        ')
    }
    else
    {
        chat.append('													           \
        <div class="message server_message" style="color: ' + (message.color || 'gray') + ';"> \                                      \
    		<span class="message_content">' + message.text + ' </span>             \
    	</div>																       \
        ')
    }

    var height = chat.prop('scrollHeight')

    chat.animate( {
      scrollTop: height
    }, 100)
})

$('#message_send').submit( function(ev) {
    var text = $('.message_text')
    socket.emit('chat_new_message', text.val())
    text.val('')
    ev.preventDefault()
})
