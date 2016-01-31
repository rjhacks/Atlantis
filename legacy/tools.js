
function getSegment(x, y) {
	// compute the column and row
	var trueX = x - offsetX;
	var trueY = y - offsetY;
	var col = Math.floor(trueX / columnWidth);
	var row = Math.floor(trueY / rowHeight);

	// see if the point falls in "shared area" between two columns
	if (trueX > (col * columnWidth) + hexagonSide) {
		// yes, shared area
		//debug("Shared area");
		var sharedWidth = columnWidth - hexagonSide;
		var relX = trueX - (col * columnWidth) - hexagonSide;
		var relY = trueY - (row * rowHeight);
		//debug("SharedWidth: " + sharedWidth + ", relY: " + relY + ", rowHeight: " + rowHeight);
		var linePos = sharedWidth * (relY / rowHeight);
		
		if (col % 2 != row % 2) { linePos = sharedWidth - linePos; }
		
		
		if (relX > linePos) {
			//debug("Relative x: " + relX + ", line pos: " + linePos);
			// it's in the other segment, the one to the right
			col++;
		}
	}
	
	//debug("Original col,row: " + col + "," + row);
	if (col < 0 || row < 0) {
		return -1;
	}
	if (col % 2 == 0) {
		row -= row % 2;
	} else {
		row -= (row - 1) % 2;
	}
	//debug("Corrected col,row: " + col + "," + row);

	// find the segment for those coordinates
	if (segments[col] && segments[col][row]) {
		return segments[col][row];
	} else {
		return -1;
	}
}

function getSpot(x, y, segment) {
	if (segment == -1) { return -1; }
	
	var defaultRotation = 90/360;
	for (var pos = 0; pos < 7; pos++) {
		// get the middle point of the segment (and spot 0)
		var centerX = offsetX + segment.column*columnWidth + hexagonSide/2;
		var centerY = offsetY + segment.row*rowHeight + rowHeight;
		
		// adjust for spots other than 0
		if (pos != 0) {
			centerY += spotDist * Math.sin(Math.PI*spotRotation + ((Math.PI*2)/6)*(pos-1) + Math.PI*2*defaultRotation);
			centerX += spotDist * Math.cos(Math.PI*spotRotation + ((Math.PI*2)/6)*(pos-1) + Math.PI*2*defaultRotation);
		}
		
		// get the squared distance to the center of the spot
		var dist = Math.pow((x - centerX),2) + Math.pow((y - centerY),2);
		if (dist < Math.pow(spotRadius,2)) {
			var test = Math.pow(spotRadius,2);
			return segment.spots[pos];
		}
	}
	
	return -1;
}

function getMouseX(e) {
	var posx = 0;
	if (!e) var e = window.event;
	if (e.pageX) 	{
		posx = e.pageX;
	}
	else if (e.clientX) 	{
		posx = e.clientX + document.body.scrollLeft
			+ document.documentElement.scrollLeft;
	}

	posx = posx - atlantis.offsetLeft;
	return posx;
}

function getMouseY(e) {
	var posy = 0;
	if (!e) var e = window.event;
	if (e.pageY) 	{
		posy = e.pageY;
	}
	else if (e.clientY) 	{
		posy = e.clientY + document.body.scrollTop
			+ document.documentElement.scrollTop;
	}

	posy = posy - atlantis.offsetTop;
	return posy;
}

/** This method will return the path traversed to go from 'from' to 'to' 
 * in a straight line, or an empty array if there is no straight-line path
 * path between 'from' and 'to'.
 * @param from
 * @param to
 * @return
 */
function getPath(from, to) {
	var path = [];
	searchDepth:
	for (var depth = 1; depth <= 6; depth++) {
		for (var i = 0; i < 6; i++) {
			if (from.neighbours[depth][i] == to) {
				for (var j = 0; j <= depth; j++) {
					path[j] = from.neighbours[j][i];
				}
				break searchDepth;
			}
		}
	}
	return path;
}

function getMoveChanges(from, to, clearPlayerIfEmpty) {
	var changes = [];
	
	// see if this was a valid move
	var validMove = false;
	var path = -1;
	if (from != -1 && to != -1) {
		path = getPath(from, to);
		if (path.length > 0 
			&& path.length-1 <= from.blocks - from.blocksMoved
			&& !from.segment.moved)
		{
			// this was a valid move, but we still need to check the aliveness of the path
			validMove = true;
			
			// check the entire path is alive.
			for (var i = 0; i < path.length; i++) {
				if (!path[i].isAlive()) {
					validMove = false;
				}
			}
		}
	}
	
	if (!validMove) { return -1; }
	
	// create a clone of the from and to objects, because we know they're going to change
	var player = from.player;
	var blocksRemaining = path.length - 1;

	path[0] = clone_shallow(path[0]);
	changes[0] = path[0];
	for (var i = 1; i < path.length; i++) {
		path[i] = clone_shallow(path[i]);
		
		// remove the blocks from the source spot
		path[i-1].blocks -= blocksRemaining;
		if (path[i-1].blocks == 0 && clearPlayerIfEmpty) {
			path[i-1].player = -1;
		}
		
		// move the blocks to the next step in the path
		if (path[i].player == -1 || path[i].player == player) { // no opposing blocks present
			path[i].blocks += blocksRemaining;
			path[i].player = player;
		} else { // opposing blocks present
			path[i].blocks -= blocksRemaining;
			blocksRemaining = 0;
			if (path[i].blocks < 0) { // more blocks added than opposing blocks present
				if (clearPlayerIfEmpty || i == path.length - 1) {
					/* skip this if the empty-spots aren't cleared and this isn't the
					/* last spot in the path - this means it's just a hover (no click)
					 * and it'll be fancy to show that another player's blocks were eaten
					 * here.
					 */ 
					path[i].player = player; // player has conquered the spot
				}
				path[i].blocks = -path[i].blocks;
				blocksRemaining = path[i].blocks;
			}
		}
		if (path[i].blocks == 0 && clearPlayerIfEmpty) { // no more blocks left
			path[i].player = -1; // no player owns this spot
		}
		
		// store the spot as changed
		changes[i] = path[i];
	}

	// mark blocks on target spot as moved
	path[path.length-1].blocksMoved += blocksRemaining;
	
	// return an array containing all changed spots
	return changes;
}

function clone_shallow(obj){
	if(obj == null || typeof(obj) != 'object')
		return obj;

	var temp = {};
	for(var key in obj) {
		temp[key] = obj[key];
	}
	return temp;
}

function become(victim, blueprint) {
	if(blueprint == null || typeof(blueprint) != 'object')
		return false;
	
	for(var key in blueprint) {
		victim[key] = blueprint[key];
	}
	
	return true;
}

function serialize() {
	var output = '<atlantis turn="' + turn + '" move="' + currentMove + '">\n\n';
	for (var col = 0; col < columns; col++) {
		for (var row = col % 2; row < rows; row += 2) {
			if (segments[col] && segments[col][row]) { // find all initialized segments
				output += segments[col][row].serialize() + "\n\n";
			}
		}
	}
	return output + "</atlantis>";
}

function deserialize(text, replay) {
	
	/* Find out what turn it is */
	if (text.substring(0,16) != "<atlantis turn=\"") { debug("Parsing error. (0)"); return; }
	text = text.substring(16);
	turn = parseInt(text.substring(0, text.indexOf('"'))) - 1;
	text = text.substring(text.indexOf('"'));
	if (text.substring(0, 8) != '" move="') { debug("Parsing error(0.1)"); return; }
	text = text.substring(8);
	
	if (!replay) {
		var old = currentMove;
		currentMove = parseInt(text.substring(0, text.indexOf('"')));
		if (showMove == old) {
			showMove = currentMove;
		}
	}
	
	text = text.substring(text.indexOf(">\n\n") + 3);
	
	if (replay || showMove == currentMove) {
		/* Parse the received file */
		segments = [];
		var done = false;
		while (!done) {
			if (text.substring(0, 8) == "<segment") {
				/* Create a segment */
				var seg = new Segment(getContext(), 0, 0);
				
				/* Have the segment filled with sensible values */
				text = seg.deserialize(text);
				
				/* Store the segment in its correct place */
				if (!segments[seg.column]) {
					segments[seg.column] = [];
				}
				segments[seg.column][seg.row] = seg;
			} else {
				done = true;
			}
		}
		
		/* Do the local computation required to make the board work */
		setup_board_done(true);		
	}
	
	/* Start playing the game */
	is_replay = replay;
	play_start();
}

function save() {
	move_nr++;
	var text = serialize();
	var regexp = /%20/g; // match %20 any number of times
	text = encodeURIComponent(text).replace(regexp,"+"); // encode for POST-ing
	
	var req = new XMLHttpRequest();
	//debug("Saving move " + currentMove);
	req.open("POST", SAVEURL, false); // synchronous save
	req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	
	try {
		req.send("id=" + gameId + "&player=" + player + "&xml=" + text);
	} catch (error) {
		alert("I got an error saying: " + error);
	}
	
	if (req.status != 200) {
		alert("Save failed: " + req.responseText);
	} else if (gameId == -1) {
		gameId = parseInt(req.responseText);
	}
		
	return req.responseText;
}

function load(id, move, replay) {
	var url = LOADURL + "?id=" + id + "&move=" + move;
	move_nr = move;
	// issue an asynchronous request for the url
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
		if (req.readyState == 4) { // request has completed
			if (req.status == 200) { // request was succesful
				deserialize(req.responseText, replay);
			} else { // request failed
				alert("Loading failed, sorry.");
			}
		}
	}
	
	req.open("GET", url, true); // asynchronous request
	req.send(null);
}

function debug(text) {
	var dbfield = document.getElementById('debug');
	dbfield.innerHTML += text + "<br>\n";
}

function debug_literal(text) {
	var dbfield = document.getElementById('debug');
	dbfield.childNodes[0].data += text + "\n";
}

function getURLVar(urlVarName) {
	//divide the URL in half at the '?'
	var urlHalves = String(document.location).split('?');
	var urlVarValue = '';
	if(urlHalves[1]){
		//load all the name/value pairs into an array
		var urlVars = urlHalves[1].split('&');
		//loop over the list, and find the specified url variable
		for(i=0; i<=(urlVars.length); i++){
			if(urlVars[i]){
				//load the name/value pair into an array
				var urlVarPair = urlVars[i].split('=');
				if (urlVarPair[0] && urlVarPair[0] == urlVarName) {
					//I found a variable that matches, load it's value into the return variable
					urlVarValue = urlVarPair[1];
				}
			}
		}
	}
	return urlVarValue;   
}

function wait() {
	// determine the next move (last loaded move + 1)
	var next_move = Number(move_nr) + 1;
	
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
		if (req.readyState == 4) { // request has completed
			if (req.status == 200) { // request was succesful
				//debug("Getting move " + req.responseText);
				move_nr_ok = true;
				load(gameId, req.responseText, false);
			}
		}
	}
	var url = WAITURL + "?id=" + gameId + "&player=" + player + "&mode=wait";
	if (move_nr_ok) {
		url += "&move=" + next_move;
	}
	req.open("GET", url, true); // asynchronous request
	req.send(null);
}

function retrieve_notify() {
	var req = new XMLHttpRequest();
	var url = MAILURL + "?id=" + gameId + "&player=" + player + "&retrieve=true";
	req.open("GET", url, false); // synchronous request
	req.send(null);
	if (req.status == 200) { // request succesful
		if (req.responseText != '') {
			document.getElementById('mailcb').checked = true;
			document.getElementById('mailaddr').value = req.responseText;
		}
	}
}

function register_notify() {
	if (document.getElementById('mailcb').checked) {
		var addr = document.getElementById('mailaddr').value;
		if (addr != "") {
			var req = new XMLHttpRequest();
			var url = MAILURL + "?id=" + gameId + "&player=" + player + "&modify=true&addr=" + addr;
			req.open("GET", url, false); // synchronous request
			req.send(null);
			if (req.status != 200) { // request failed
				alert("Failed to register that address, sorry...");
			} else {
				alert("You will now receive a mail every time your turn arrives");
			}
		} else {
			alert("Vul een e-mailadres in als je mailtjes wilt krijgen...");
		}
	} else {
		var req = new XMLHttpRequest();
		var url = MAILURL + "?id=" + gameId + "&player=" + player + "&modify=true";
		req.open("GET", url, false); // synchronous request
		req.send(null);
		if (req.status != 200) { // request failed
			alert("Failed to unregister that address, sorry...");
		} else {
			alert("You will no longer receive mails");
		}
	}
}

function do_notify(rec_player) {
	var req = new XMLHttpRequest();
	var url = MAILURL + "?id=" + gameId + "&player=" + rec_player;
	req.open("GET", url, true); // asynchronous request
	req.send(null);
}

function do_sound() {
	var glass = document.getElementById("glass");
	glass.Play();
	var current = new Date();
}

var blinkid = 0;
var blinkon = false;
var blinkmsg = true;
function toggle_blink_title(on) {
	if (on == blinkon) { return; }
	
	blinkmsg = on;
	do_blink_title(on);
	if (on) {
		blinkid = setInterval("do_blink_title()", 1000);
	} else {
		clearInterval(blinkid)
	}
	blinkon = on;
}

function do_blink_title() {
	if (blinkmsg) {
		document.title = "Your turn!";
	} else {
		document.title = "Atlantis";
	}
	blinkmsg = !blinkmsg;
}