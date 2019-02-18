var canvas
var ctx

var writing = false

var tool = 'pen'

var pen_radius = 6
var pen_color = '#000'

var prevloc = {x:0, y:0}

var page = $('body')

var cursor_layer, cursor_ctx

socket.on('canvas_draw_line', function(line) {
    ctx.beginPath()
    ctx.lineWidth = line.radius
    ctx.strokeStyle = line.color
	ctx.moveTo(line.x1, line.y1)
	ctx.lineTo(line.x2, line.y2)
	ctx.stroke()
})

socket.on('canvas_draw_point', function(point) {
    ctx.beginPath()
    ctx.lineWidth = point.radius
    ctx.strokeStyle = point.color
	ctx.moveTo(point.x, point.y)
	ctx.lineTo(point.x, point.y)
	ctx.stroke()
})

socket.on('canvas_clear', function(clear) {
	var s = ctx.fillStyle
	ctx.fillStyle = clear.color
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	ctx.fillStyle = s
})

$(document).ready(function()
{
	canvas = $('#drawing_canvas').get(0)
	cursor_layer = $('#cursor_layer').get(0)
	
	ctx = canvas.getContext('2d')
	cursor_ctx = cursor_layer.getContext('2d')
	
	ctx.fillStyle = "#fff"
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	
	ctx.fillStyle = "#000"
	
	ctx.lineWidth = 3
	ctx.translate(0.5,0.5)
	ctx.lineCap='round'
	
	cursor_layer.onmousedown = function(ev)
	{
	    tool = 'pen'
		
		prevloc = getMouseLocation(cursor_layer, ev)
	
		if (tool == 'pen')
		{
			writing = true
			page.addClass('nonselectible')
			page.css( 'cursor', 'crosshair')
			var loc = getMouseLocation(cursor_layer, ev)
			socket.emit('canvas_draw_point', {x: loc.x, y: loc.y, color: pen_color, radius: pen_radius})
		}
	}
})

document.onmouseup = function(ev)
{
	writing = false
	
	page.removeClass('nonselectible')
	page.css( 'cursor', 'default' )
	
}

document.onmousemove = function(ev)
{
	var loc = getMouseLocation(cursor_layer, ev)
	
	if (writing == true)
	{
		socket.emit('canvas_draw_line', {x1: prevloc.x, y1: prevloc.y, x2: loc.x, y2: loc.y, color: pen_color, radius: pen_radius})
		prevloc = loc
	}
	
	/*
		Affichage du curseur sur le canvas
	*/
	cursor_ctx.clearRect(0, 0, cursor_layer.width, cursor_layer.height)
	
    
    cursor_ctx.strokeStyle = pen_color
    cursor_ctx.lineWidth = 6
	cursor_ctx.beginPath()
    cursor_ctx.arc(loc.x, loc.y, Math.max(1, pen_radius/2 - 3) ,0,2*Math.PI)
    cursor_ctx.stroke()
    
    cursor_ctx.strokeStyle = "#000"
    cursor_ctx.lineWidth = 1
	cursor_ctx.beginPath()
    cursor_ctx.arc(loc.x, loc.y, Math.max(1, pen_radius/2 - 0.5) ,0,2*Math.PI)
    cursor_ctx.stroke()
}

function  getMouseLocation(elem, evt) {
  var rect = elem.getBoundingClientRect(),
      scaleX = elem.width / rect.width,
      scaleY = elem.height / rect.height

  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY
  }
}

// Tools
$('.pensize').change(function() {
	pen_radius = $(this).val()
})

$('.colors .item').click(function() {
	pen_color = $(this).css('backgroundColor')
	$('.colors .item').removeClass('selected')
	$(this).addClass('selected')
})

$('.item.rubber').click(function() {
	socket.emit('canvas_clear', '#fff')
})