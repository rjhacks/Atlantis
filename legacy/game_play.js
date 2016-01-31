var selectedSpot = -1;
var highlightedSpot = -1;
var turn = -1;
var performedChanges = [];
var player = -1; /* The nr of the local player */
var currentMove = 1;
var showMove = 1;
var firstDoneClick = true;
var move_nr = 1;
var move_nr_ok = false;

function play_start() {
	// find out what the number of the local player is
	player = getURLVar("player");
	if (player == '') {
		player = -1;
		topbox.innerHTML = "<center>You are only an observer. Look, but don't touch. ;-)</center>";
		return;
	}
	
	// register mouse handlers
	document.onmousemove = play_mouseMoved;
	document.onclick = play_mouseClicked;
	
	// show the option to send mails
	retrieve_notify();
	document.getElementById('mailbox').style.visibility = "visible";
	
	// start the first turn
	play_next_turn();
}

function play_next_turn() {
	// clear the turn-related variables
	for (var col = 0; col < columns; col++) {
		for (var row = col % 2; row < rows; row += 2) {
			if (segments[col] && segments[col][row]) {
				segments[col][row].nextTurn();
			}
		}
	}
	performedChanges = [];
	
	// decide who gets the turn
	turn = (turn + 1) % nextPlayer;
	
	// set the contents of the top box
	if (!is_replay) {
		var topcontent = "<center>";
		if (turn == player) {
			topcontent += "<div class=\"margined\">" +
								"Play your turn. Click \"I'm done!\" when you have finished." +
							"</div>";
		} else {
			topcontent += "<div class=\"margined\">" +
								"It's not your turn. Wait for player " + turn + " to move." +
							"</div>";
		}
		topcontent += '<input id="firstbutton" class="margined" type="button" value="<< First" onclick="play_move_first()">' +
						'<input id="backbutton" class="margined" type="button" value="< Back" onclick="play_move_back()">' +
						"<input id=\"donebutton\" class=\"margined\" type=\"button\" value=\"I'm done!\" onclick=\"play_finish_turn()\">" +
						"<input id=\"resetbutton\" class=\"margined\" type=\"button\" value=\"Reset\" onclick=\"play_reset()\">" +
						'<input id="fwrdbutton" class="margined" type="button" value="Forward >" onclick="play_move_forward()" DISABLED>' +
						'<input id="lastbutton" class="margined" type="button" value="Last >>" onclick="play_move_last()" DISABLED>' +
						"</center>";
		topbox.innerHTML = topcontent;
		
		play_buttoncheck();
		
		if (turn != player) { // wait for other players to take action
			wait();
		} else if (move_nr > 1) {
			do_sound(); // notify the player it's his/her turn
			toggle_blink_title(true);
		}
	}
}


function play_finish_turn() {
	if (showMove == currentMove) {
		showMove++;
	}
	currentMove++;
	
	if (firstDoneClick) {
		save();
		if (showMove == currentMove) {
			showMove++;
		}
		currentMove++;
		firstDoneClick = false;
	}
	
	var result = play_boom();
	
	if (result) {
		save();
		topbox.innerHTML = "<center>" +
								"<div class=\"margined\">" +
										"Player " + turn + " - you had booms. Click \"Continue\" to continue." +
								"</div>" +
								"<input class=\"margined\" type=\"button\" value=\"Continue!\" onclick=\"play_finish_turn()\">" +
								"<input class=\"margined\" type=\"button\" value=\"Reset\" onclick=\"play_reset()\" DISABLED>" +
							"</center>";
	} else {
		play_grow();
		play_next_turn();
		save(); // save the state of the game
		do_notify(turn);
		firstDoneClick = true;
	}
	redraw();
}

function play_boom() {
	var result = false;
	var booms = [];
	var boomcount = 0;
	for (var col = 0; col < columns; col++) {
		if (segments[col]) {
			for (var row = col % 2; row < rows; row += 2) {
				if (segments[col][row]) {
					if(segments[col][row].blow1(turn)) {
						booms[boomcount] = segments[col][row];
						boomcount++;
						result = true;
					}
				}
			}
		}
	}
	for (var i = 0; i < boomcount; i++) {
		booms[i].blow2(turn);
	}
	return result;
}

function play_grow() {
	for (var col = 0; col < columns; col++) {
		if (segments[col]) {
			for (var row = col % 2; row < rows; row += 2) {
				if (segments[col][row]) {
					result = segments[col][row].grow(turn);
				}
			}
		}
	}
}

function play_mouseMoved(e) {
	toggle_blink_title(false);
	if (player != turn) { return; }
	var posx = getMouseX(e);
	var posy = getMouseY(e);
	
	// find the segment that the mouse is currently hovering over
	if (posx > 0 && posy > 0) {
		var segment = getSegment(posx, posy);

		// find the spot being hovered over
		var spot = getSpot(posx, posy, segment);
		
		if (spot != highlightedSpot) {
			if (highlightedSpot != -1) {
				highlightedSpot.highlighted = false;
			}
			
			if (spot != -1 && (spot.player == -1 || spot.player == turn || selectedSpot != -1) && spot.isAlive()) {
				spot.highlighted = true;
				highlightedSpot = spot;
				
				possibleChanges = [];
				var changes = getMoveChanges(selectedSpot, spot, false);
			
				if (changes != -1) {
					// this was a valid move, show the results as they'd be if clicked
					for (var i = 0; i < changes.length; i++) {
						var col = changes[i].segment.column;
						var row = changes[i].segment.row;
						var pos = changes[i].pos;
						if (!possibleChanges[col]) {
							possibleChanges[col] = []; 
						}
						if (!possibleChanges[col][row]) {
							possibleChanges[col][row] = [];
						}
						possibleChanges[col][row][pos] = changes[i];
					}
				}
			}

			redraw();
		}
	}
}

function play_mouseClicked(e) {
	if (player != turn) { return; }
	var posx = getMouseX(e);
	var posy = getMouseY(e);
	
	if (posx > 0 && posy > 0) {
		// find the segment that was clicked
		var segment = getSegment(posx, posy);

		// find the spot that was clicked
		var spot = getSpot(posx, posy, segment);
		
		if (spot == selectedSpot) {
			spot = -1;
		}
		
		if (selectedSpot != -1) {
			selectedSpot.selected = false;
		}
		
		if (spot != -1) {
			var changes = getMoveChanges(selectedSpot, spot, true);
			if (changes == -1) {
				// this was not a valid move, interpret as selection
				if (spot.player == -1 || spot.player == turn) {
					// this is a selectable spot for this turn
					spot.selected = true;
					selectedSpot = spot;
				} else {
					selectedSpot = -1;
				}
			} else {
				if (highlightedSpot != -1) {
					highlightedSpot.highlighted = false;
				}
				
				// apply the changes
				for (var i = 0; i < changes.length; i++) {
					var col = changes[i].segment.column;
					var row = changes[i].segment.row;
					var pos = changes[i].pos;
					
					// make a backup copy of the spot
					if (!performedChanges[col]) { performedChanges[col] = []; }
					if (!performedChanges[col][row]) { performedChanges[col][row] = []; }
					if (!performedChanges[col][row][pos]) {
						performedChanges[col][row][pos] = clone_shallow(segments[col][row].spots[pos]);
					}
					
					// apply the change
					segments[col][row].spots[pos].become(changes[i]);
				}
				
				// mark source segment as moved
				selectedSpot.segment.moved = true;
				selectedSpot = -1;
			}
		} else {
			selectedSpot = -1;
		}

		possibleChanges = [];
		highlightedSpot = -1;
		redraw();
	}
}

function play_reset() {
	// run across all the stored spots, and set them back
	for (var col = 0; col < columns; col++) {
		if (performedChanges[col]) {
			for (var row = col % 2; row < rows; row += 2) {
				if (performedChanges[col][row]) {
					
					for (var i = 0; i < 7; i++) { // run across all the spots
						if (performedChanges[col][row][i]) { // if the spot was changed (backed up)
							// set it back
							segments[col][row].spots[i].become(performedChanges[col][row][i]);
						}
					}
					
				}
			}
		}
	}
	
	// clear the turn-related variables
	for (var col = 0; col < columns; col++) {
		for (var row = col % 2; row < rows; row += 2) {
			if (segments[col] && segments[col][row]) {
				segments[col][row].nextTurn();
			}
		}
	}
	performedChanges = [];
	
	// show the reset
	redraw();
}

function play_reload() {
	load(gameId);
}

function play_move_back() {
	if (showMove > 1) {
		showMove--;
		play_buttoncheck();
		load(gameId, showMove, true);
	}
}

function play_move_forward() {
	if (showMove < currentMove) {
		showMove++;
		play_buttoncheck();
		load(gameId, showMove, showMove != currentMove)
	}
}

function play_move_first() {
	showMove = 1;
	play_buttoncheck();
	load(gameId, showMove, showMove != currentMove);
}

function play_move_last() {
	showMove = currentMove;
	play_buttoncheck();
	load(gameId, showMove, false);
}

function play_buttoncheck() {
	if (player == turn && showMove == currentMove) {
		if (showMove == 1 || !firstDoneClick) {
			document.getElementById('backbutton').disabled = true;
			document.getElementById('firstbutton').disabled = true;
		} else {
			document.getElementById('backbutton').disabled = false;
			document.getElementById('firstbutton').disabled = false;
		}
		document.getElementById('donebutton').disabled = false;
		document.getElementById('resetbutton').disabled = false;
		document.getElementById('fwrdbutton').disabled = true;
		document.getElementById('lastbutton').disabled = true;
	} else {
		if (showMove == 1) {
			document.getElementById('backbutton').disabled = true;
			document.getElementById('firstbutton').disabled = true;
		} else {
			document.getElementById('backbutton').disabled = false;
			document.getElementById('firstbutton').disabled = false;
		}
		document.getElementById('donebutton').disabled = true;
		document.getElementById('resetbutton').disabled = true;
		if (showMove == currentMove) {
			document.getElementById('fwrdbutton').disabled = true;
			document.getElementById('lastbutton').disabled = true;
		} else {
			document.getElementById('fwrdbutton').disabled = false;
			document.getElementById('lastbutton').disabled = false;
		}
	}
}