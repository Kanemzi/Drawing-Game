/*
    connection.js
    -> gère la connexion du client à la room
    -> gère la déconnexion du client à la room

    -> gère l'affichage des joueurs dans la liste (apparition et disparition des noms des joueurs dans le scoreboard)
*/
var socket = io.connect(socket_address + '?token=' + join_token + '&room=' + room + '&name=' + name, { forceNew : true } )

var alive

var connection_timeout = setTimeout(function() {
  alert('délais de connexion dépassé...')
  window.location.replace('/account')
}, 5000)

socket.on('connect', function() {
  clearTimeout(connection_timeout)
  alive = setInterval(() => {
		socket.emit('alive', {})
  }, 1000)
})

socket.on('disconnect', function() {
    alert('vous avez été déconnecté')
    window.location.replace('/account')
})

socket.on('player_join', function(playerinfo) {
    $('.scoreboard').append('													                  \
    <div class="user" id="p_' + playerinfo.name + '">					      		\
        <div class="user_avatar"></div>									                \
			<div class="user_info">										                      	\
				<span class="user_name">' + playerinfo.name + '</span>		      \
				<span class="user_level">Lvl' + playerinfo.level + '</span>    	\
			</div>														                               	\
			<div class="user_party">									                      	\
				<span class="user_score">0 pts</span>						              \
				<span class="user_rank">21</span>							                  \
			</div>															                              \
		</div>																                              \
    ')
})

socket.on('player_connection_lost', function(playerinfo) {
	$('#p_'+playerinfo.name).addClass('user_disconnected')
})

socket.on('player_reconnect', function(playerinfo) {
	$('#p_'+playerinfo.name).removeClass('user_disconnected')
	//alert(playerinfo.name + " est toujours debout en fait")
})

socket.on('player_quit', function(playerinfo) {
    $('#p_'+playerinfo.name).slideDown(200, function() {
    	$(this).remove()
    })
})

socket.on('room_closed', function() {
	alert('la room a été fermée...')
	window.location.replace('/account')
})

socket.on('room_join_error', function() {
	alert('connexion à la room impossible')
	window.location.replace('/404')
})

socket.on('new_notification', function(notification) {
	var i = Math.round(Math.random() * 0xffffff)
    $('#notifications').append('										\
	<div id="' + i + '" class="notification type' + notification.type + '">					\
		<i class="fa fa-times fa-2x close" aria-hidden="true"></i>				\
	    ' + notification.text + '												\
	</div>																		\
	')
	var n = $('#' + i)
	n.hide()
	n.slideDown(200)

  function close_notification() {
    n.hide(200, function() {
			n.remove()
		})
  }

	n.find('.close').click(function() {
		close_notification()
	})

	setTimeout(function() {
		close_notification()
	}, 5000)
})
