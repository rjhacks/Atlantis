var maxPlayers = 4;
var nextPlayer = 0;
var startingPoints = [];

function setup_players_start() {
	var ctx = getContext();
	
	// register mouse handlers
	document.onmousemove = setup_players_mouseMoved;
	document.onclick = setup_players_mouseClicked;
	
	// set the contents of the top box
	topbox.innerHTML = "<center>" +
							"<div class=\"margined\">" +
									"Please choose the starting locations of the players, by clicking on the segments you want. Click \"I'm done!\" when you have finished." +
							"</div>" +
							"<input class=\"margined\" type=\"button\" value=\"I'm done!\" onclick=\"setup_players_done()\">" +
							"<input class=\"margined\" type=\"button\" value=\"Reset\" onclick=\"setup_players_reset()\">" +
						"</center>";
}


function setup_players_mouseMoved(e) {
	var posx = getMouseX(e);
	var posy = getMouseY(e);
	
	// find the segment that the mouse is currently hovering over
	if (posx > 0 && posy > 0) {
		var nwSegment = getSegment(posx, posy);
		if (selectedSegment != nwSegment) {
			selectedSegment.highlighted = false;
			if (!selectedSegment.selected) {
				selectedSegment.color = defaultColor;
			}
			nwSegment.highlighted = true;
			if (!nwSegment.selected) {
				nwSegment.color = colors[nextPlayer];
			}
			selectedSegment = nwSegment;
			redraw();
		}
	}
}

function setup_players_mouseClicked(e) {
	var posx = getMouseX(e);
	var posy = getMouseY(e);
	
	// find the segment that was clicked
	if (posx <= 0 || posy <= 0) {
		return;
	}
	var clickedSegment = getSegment(posx, posy);
	if (clickedSegment == -1) {
		return;
	}
	
	// check that a player can be added at this segment
	if (nextPlayer < maxPlayers && !clickedSegment.selected) {
		// mark the clicked segment as selected
		clickedSegment.selected = true;
		startingPoints[nextPlayer] = clickedSegment;
		
		// set the color of the clicked segment
		clickedSegment.color = colors[nextPlayer];
		
		// go to the next player
		nextPlayer++;
	}
	redraw();
}

function setup_players_reset() {
	startingPoints = [];
	nextPlayer = 0;
	
	// iterate over all segments. Reset them all to unselected.
	for (var i = 0; i < columns; i++) {
		for (var j = i % 2; j < rows; j += 2) {
			if (segments[i][j]) {
				segments[i][j].selected = false;
				segments[i][j].color = defaultColor;
			}
		}
	}
	
	redraw();
}

function setup_players_done() {
	// fill the selected starting segments with blocks of the selected player
	for (var i = 0; i < nextPlayer; i++) {
		startingPoints[i].selected = false;
		startingPoints[i].color = defaultColor;
		for (var j = 0; j < 7; j++) {
			startingPoints[i].spots[j].player = i;
			startingPoints[i].spots[j].blocks = 1;
		}
	}
	
	turn = 0;
	save();
	
	main.innerHTML = "<center>" +
			"The game has been created. Give the following links to the players:<br>";
	for (var i = 0; i < nextPlayer; i++) {
			var link = HOST + "?id=" + gameId + "&player=" + i; 
			main.innerHTML += "Player " + i + ": <a href='" + link + "'>" + link + "</a><br>";
	}
	main.innerHTML += "</center>";
	topbox.style.visibility = 'hidden';
	atlantis.style.visibility = 'hidden';
	main.style.visibility = 'visible';
}