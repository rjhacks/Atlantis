function setup_board_start() {
	var ctx = getContext();
	
	// create all segments
	for (var col = 0; col < columns; col++) {
		segments[col] = [];
		for (var row = col % 2; row < rows; row += 2) {
			segments[col][row] = new Segment(ctx, col,row);
		}
	}
	
	// register mouse handlers
	document.onmousemove = setup_board_mouseMoved;
	document.onclick = setup_board_mouseClicked;
	
	// set the contents of the top box
	topbox.innerHTML = "<center>" +
							"<div class=\"margined\">" +
									"Please choose the shape of the board, by clicking on the segments you want. Click \"I'm done!\" when you have finished." +
							"</div>" +
							"<input class=\"margined\" type=\"button\" value=\"I'm done!\" onclick=\"setup_board_done(false)\">" +
						"</center>";
	
	redraw();
	
}

function setup_board_mouseMoved(e) {
	var posx = getMouseX(e);
	var posy = getMouseY(e);
	
	// find the segment that the mouse is currently hovering over
	if (posx > 0 && posy > 0) {
		var nwSegment = getSegment(posx, posy);
		if (selectedSegment != nwSegment) {
			selectedSegment.highlighted = false;
			nwSegment.highlighted = true;
			selectedSegment = nwSegment;
			redraw();
		}
	}
}

function setup_board_mouseClicked(e) {
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
	
	// tell the clicked segment it is now (de)selected
	clickedSegment.selected = !clickedSegment.selected;
	redraw();
}

function setup_board_done(from_load) {
	// pretend a close-fitting rectangle is drawn around the selected board - find this rectangle
	var leftSet = false;
	var left = 0;
	var topSet = false;
	var top = 0;
	var right = 0;
	var bottom = 0;
	
	// iterate over all segments. Keep only those that have been selected.
	for (var i = 0; i < columns; i++) {
		for (var j = i % 2; j < rows; j += 2) {
			if ((!from_load && segments[i][j].selected) 
				|| (from_load && segments[i] && segments[i][j])) {
				segments[i][j].selected = false;
				
				// find the position of this segment
				var x = (i * columnWidth) - columnRemaining;
				var y = j * rowHeight;
				
				// expand the selection rectangle, if necessary
				if (x < left || !leftSet) {
					left = x;
					leftSet = true;
				}
				if (x + columnWidth + columnRemaining > right) {
					right = x + columnWidth + columnRemaining;
				}
				if (y < top || !topSet) {
					top = y;
					topSet = true;
				}
				if (y + 2*rowHeight > bottom) {
					bottom = y + 2*rowHeight;
				}
				
			} else if (!from_load) {
				delete segments[i][j];
			}
		}
	}

	// finalize all segments
	for (var col = 0; col < columns; col++) {
		for (var row = col % 2; row < rows; row += 2) {
			if (segments[col] && segments[col][row]) {
				segments[col][row].finalize1();
			}
		}
	}
	for (var col = 0; col < columns; col++) {
		for (var row = col % 2; row < rows; row += 2) {
			if (segments[col] && segments[col][row]) {
				segments[col][row].finalize2();
			}
		}
	}
	
	// translate the field so that the rectangle is nicely centered
	if (!from_load || !loaded) {
		var ctx = getContext();
		ctx.restore();
		offsetX = ((atlantis.offsetWidth - (right - left)) / 2) - left;
		offsetY -= top;
		ctx.save();
		ctx.translate(offsetX, offsetY);
		loaded = true;
	}
	
	// show the new field
	redraw();
	
	if (!from_load) {
		// move to the next game phase - player selection
		setup_players_start();
	}
}