var HOST = "http://localhost/~RJH/Atlantis";
var LOADURL = HOST + "/load.php";
var SAVEURL = HOST + "/save.php";
var WAITURL = HOST + "/wait.php";
var MAILURL = HOST + "/mail.php";

var loaded = false;
var is_replay = false;

var columns = 6;
var rows = 7;
var hexagonSide = 100;
var spotRadius = 23;
var spotGrowCoreRadius = spotRadius / 2;
var spotDeadCoreRadius = spotRadius / 4;
var spotRotation = 30/180 - 10.893/180; // 30 degrees to corners, 10.893 degrees back
var columnRemaining = hexagonSide*Math.cos(Math.PI*2/6);
var columnWidth = hexagonSide + columnRemaining;
var segmentRadius = (hexagonSide / 2) + (hexagonSide*Math.cos(Math.PI*2/6));
var rowHeight = hexagonSide * Math.sin(Math.PI*2/6);
var spotDist = segmentRadius * 0.655
var offsetX = columnWidth / 2;
var offsetY = rowHeight / 3;
var segments = [];
var possibleChanges = [];
var atlantis; // set up in create();
var topbox; // set up in create();
var main;
var selectedSegment = -1;
var defaultColor = "black";
var coreColor = "white";
var colors = ["red", "blue", "green", "orange", "black"];
var lightColors = ["#FF6666", "#6666FF", "#33CC33", "#FFCC00"]


function Segment(ctx, column, row) {
	this.ctx = ctx;
	this.column = column;
	this.row = row;
	this.spots = [];
	this.selected = false;
	this.highlighted = false;
	this.color = defaultColor;
	this.moved = false;
	
	for (var i = 0; i < 7; i++) {
		this.spots[i] = new Spot(ctx, this, i);
	}
	
	this.blow1 = function(player) {
		var result = false;
		for (var i = 0; i < 7; i++){
			result = this.spots[i].blow1(player) || result;
		}
		return result;
	}
	
	this.blow2 = function(player) {
		for (var i = 0; i < 7; i++){
			var result = this.spots[i].blow2(player) || result;
		}
	}
	
	this.grow = function(player) {
		for (var i = 0; i < 7; i++) {
			this.spots[i].grow(player);
		}
	}
	
	this.become = function(blueprint) {
		become(this, blueprint);
	}
	
	this.finalize1 = function() {
		for (var i = 0; i < 7; i++) {
			this.spots[i].computeNeighbours1();
		}
	}
	
	this.finalize2 = function() {
		for (var i = 0; i < 7; i++) {
			this.spots[i].computeNeighbours2();
		}
	}
	
	this.nextTurn = function() {
		this.moved = false;
		for (var i = 0; i < 7; i++) {
			this.spots[i].blocksMoved = 0;
		}
	}
	
	this.draw = function() {
		drawHexagon(ctx, this.column, this.row, (this.selected || this.highlighted ? 3 : ctx.lineWidth), this.color);
		for (var i = 0; i < 7; i++) {
			// see if there's a possible future version of this spot, if so, show that instead of the real thing
			if (possibleChanges[this.column] && possibleChanges[this.column][this.row] && possibleChanges[this.column][this.row][i]) {
				possibleChanges[this.column][this.row][i].draw(true);
			} else {
				this.spots[i].draw(false);
			}
		}
	}

	this.toString = function() { return this.column + ", " + this.row; }
	
	this.serialize = function() {
		var output = "<segment col=\"" + this.column + "\" row=\"" + this.row + "\">\n";
		for (var i = 0; i < 7; i++) {
			output += "\t" + this.spots[i].serialize() + "\n";
		}
		output += "</segment>"
		return output;
	}
	
	/* This method parses one segment's worth of XML and fills this segment with the info
	 * it finds. This is not done in a pretty way. The method returns the part of the serialized
	 * XML that it has not processed. 
	 */
	this.deserialize = function(text) {
		var next = -1;
		
		text = text.substring(9); // strip off the '<segment '
		
		if (text.substring(0,5) != "col=\"") { debug("Error while parsing. (1)"); return; }
		text = text.substring(5); // strip off the 'col="'
		
		if ((next = text.indexOf('"', 1)) < 0) { debug("Error while parsing (2)"); return; }
		this.column = parseInt(text.substring(0, next));
		text = text.substring(next+1); // strip off the col-value and quote
		
		if (text.substring(0, 6) != " row=\"") { debug("Error while parsing - got " + text.substring(0,6) + ". (3)"); return; }
		text = text.substring(6);
		
		if ((next = text.indexOf('"', 1)) < 0) { debug("Error while parsing (4)"); return; }
		this.row = parseInt(text.substring(0, next));
		text = text.substring(next+1); // strip off the row-value and quote
		
		if (text.substring(0, 2) != ">\n") { debug("Errorwhile parsing (5)"); return; }
		text = text.substring(2); // strip off the final characters
		
		/* Parse 7 spots */
		for (var i = 0; i < 7; i++) {
			text = this.spots[i].deserialize(text);
		}
		
		if (text.substring(0, 12) != "</segment>\n\n") { debug_literal("Parsing error. (6) - got '" + text.substring(0, 12) + "'"); return; }
		text = text.substring(12); // strip the </segment>
		
		return text;
	}
}

function Spot(ctx, segment, pos) {
	this.ctx = ctx;
	this.segment = segment;
	this.pos = pos;
	this.player = -1;
	this.blocks = 0;
	this.blocksMoved = 0;
	this.growing = false;
	this.dead = false;
	this.highlighed = false;
	this.selected = false;
	this.neighbours = [];
	this.boomed = false;
	
	this.draw = function(asFuture) {
		drawSpot(this, asFuture);
	}
	
	this.become = function(blueprint) {
		become(this, blueprint);
	}
	
	this.isAlive = function() {
		return !this.dead && !this.growing;
	}

	this.countLivingNeighbours = function() {
		var total = 0;
		for (var i = 0; i < 6; i++) {
			if (this.neighbours[1][i]) {
				if (this.neighbours[1][i].isAlive()) {
					total++;
				}
			}
		}
		return total;
	}
	
	this.blow1 = function(player) {
		var result = false;
		var livingNeighbours = this.countLivingNeighbours();
		if (this.blocks > 0 && this.player == player && this.blocks >= this.countLivingNeighbours()) {
			result = true;
			if (this.growing) {
				this.dead = true;
				this.growing = false;
			} else {
				this.growing = true;
			}
			this.blocks = 0;
			this.boomed = true;
		}
		return result;
	}
	
	this.blow2 = function(player) {
		if (this.boomed) {
			for (var i = 0; i < 6; i++) {
				var to = this.neighbours[1][i];
				if (to && to.isAlive()) {
					if (to.player == -1 || to.player == this.player) {
						to.blocks++;
						to.player = this.player;
					} else { // opposing blocks on that spot
						to.blocks--;
						if (to.blocks == 0) { // no blocks remaining.
							to.player = -1;
						}
					}
				}
			}
			this.boomed = false;
		}
	}
	
	this.grow = function(player) {
		if (this.growing && this.player == player) {
			this.blocks++;
		}
	}
	
	this.computeNeighbours1 = function() {
		// prepare 6 (+1) depths
		for (var i = 0; i <= 6; i++) {
			this.neighbours[i] = [];
		}
		
		// set all distance 0's (this spot)
		for (var i = 0; i < 6; i++) {
			this.neighbours[0][i] = this;
		}
		
		// find all neighbours at distance 1
		if (pos == 0) {
			// this is the middle spot, neighbours are all the other spots on the segment
			for (var i = 0; i < 6; i++) {
				this.neighbours[1][i] = this.segment.spots[i+1];
			}
		} else {
			// this is not a middle spot, some neighbours are on the segment, others not
			// first find the neighbours on the segment
			this.neighbours[1][0] = this.segment.spots[0]; // same segment, middle
			this.neighbours[1][1] = this.segment.spots[(pos - 1 > 0 ? pos - 1 : 6)]; // same segment, anti-clockwise
			this.neighbours[1][5] = this.segment.spots[(pos + 1 < 7 ? pos + 1 : 1)]; // same segment, clockwise

			// now find the neighbours on other segments
			var cols = [];
			var rows = [];
			if (pos == 1) {
				// first neighbouring segment: the one above
				// second neighbouring segment: the one to the right-top
				cols = [0, 1];
				rows = [-2, -1];
			} else if (pos == 2) {
				cols = [1, 1];
				rows = [-1, 1];
			} else if (pos == 3) {
				cols = [1, 0];
				rows = [1,2];
			} else if (pos == 4) {
				cols = [0, -1];
				rows = [2, 1];
			} else if (pos == 5) {
				cols = [-1, -1];
				rows = [1, -1];
			} else if (pos == 6) {
				cols = [-1, 0];
				rows = [-1, -2];
			}
			
			// get the first two neighbours
			var col = this.segment.column + cols[0];
			var row = this.segment.row + rows[0];
			if (col >= 0 && row >= 0 && segments[col] && segments[col][row]) {
				this.neighbours[1][3] = segments[col][row].spots[(pos+2 < 7 ? pos+2 : ((pos+2)%7) + 1)];
				this.neighbours[1][2] = segments[col][row].spots[(pos+3 < 7 ? pos+3 : ((pos+3)%7) + 1)];
			}
			
			// get the third neighbour
			col = this.segment.column + cols[1];
			row = this.segment.row + rows[1];
			if (col >= 0 && row >= 0 && segments[col] && segments[col][row]) {
				this.neighbours[1][4] = segments[col][row].spots[(pos+4 < 7 ? pos+4 : ((pos+4)%7) + 1)];
			}
			
		}
	}
	
	this.computeNeighbours2 = function() {
		for (var depth = 2; depth <= 6; depth++) {
			for (var direction = 0; direction < 6; direction++) {
				if (this.neighbours[depth-1][direction]) {
					// find out from what direction we arrive at the neighbour depth-1
					var nb0 = this.neighbours[depth-2][direction];
					var nb1 = this.neighbours[depth-1][direction];
					var srcDirect = -1;
					for (var i = 0; i < 6; i++) {
						if (nb1.neighbours[1][i]) {
							if (nb1.neighbours[1][i] == nb0) {
								srcDirect = i;
								break;
							}
						}
					}
					
					// find out in what direction we'd travel to neighbour 'depth'
					var destDirect = (srcDirect + 3) % 6;
					
					// set the correct neighbour, if there is one
					if (nb1.neighbours[1][destDirect]) {
						this.neighbours[depth][direction] = nb1.neighbours[1][destDirect];
					}
				}
			}
		}
	}
	
	this.toString = function() { return this.segment + ", spot " + pos; }
	
	this.serialize = function() {
		return "<spot"
			+ " pos=\"" + this.pos + "\""
			+ " player=\"" + this.player + "\""
			+ " blocks=\"" + this.blocks + "\""
			+ " growing=\"" + this.growing + "\""
			+ " dead=\"" + this.dead + "\""
			+ " />";
	}
	
	this.deserialize = function(text) {
		var end = text.indexOf('/>');
		var tokens = text.substring(1,end).split(' ');
		
		if (!tokens[1].substring(0, 5) == "pos=\"") { debug("Parsing error. (1.1)"); }
		this.pos = parseInt(tokens[1].substring(5, tokens[1].length-1));
		
		if (!tokens[2].substring(0, 8) == "player=\"") { debug("Parsing error. (1.1)"); }
		this.player = parseInt(tokens[2].substring(8, tokens[2].length-1));
		if (this.player >= nextPlayer) { nextPlayer = this.player + 1; }
		
		if (!tokens[3].substring(0, 8) == "blocks=\"") { debug("Parsing error. (1.1)"); }
		this.blocks = parseInt(tokens[3].substring(8, tokens[3].length-1));
		
		if (!tokens[4].substring(0, 9) == "growing=\"") { debug("Parsing error. (1.1)"); }
		this.growing = tokens[4].substring(9, tokens[4].length-1) == "true";
		
		if (!tokens[5].substring(0, 6) == "dead=\"") { debug("Parsing error. (1.1)"); }
		this.dead = tokens[5].substring(6, tokens[5].length-1) == "true";
		
		return text.substring(end+3); /* Also strip trailing newline */
	}
}

function hasSupport() {
	return document.getElementById('atlantis').getContext;
}

function getContext() {
	return document.getElementById('atlantis').getContext('2d');
}

function drawHexagon(ctx, column, row, lineWidth, color) {
	// move to the given coordinates
	ctx.save();
	ctx.translate(column * columnWidth, row * rowHeight);

	// draw the hexagon
	
	var oldWidth = ctx.lineWidth;
	var oldStrokeStyle = ctx.strokeStyle;
	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = color;
	ctx.fillStyle = "white";
	var x = 0;
	var y = 0;
	ctx.beginPath();
	ctx.moveTo(x,y);
	for (var i = 0; i < 6; i++) {
		x += hexagonSide*Math.cos((Math.PI*2/6)*i);
		y += hexagonSide*Math.sin((Math.PI*2/6)*i);
		ctx.lineTo(x,y);
	}
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(x,y);
	for (var i = 0; i < 6; i++) {
		x += hexagonSide*Math.cos((Math.PI*2/6)*i);
		y += hexagonSide*Math.sin((Math.PI*2/6)*i);
		ctx.lineTo(x,y);
	}
	ctx.stroke();
	ctx.lineWdith = oldWidth;
	ctx.strokeStyle = oldStrokeStyle;

	// jump back to the original coordinates
	ctx.restore();
}

function drawSpot(spot, asFuture) {
	var ctx = spot.ctx;
	var segment = spot.segment;
	var pos = spot.pos;
	var slices = spot.blocks;
	var growing = spot.growing;
	
	// determine color: segment's color if segment is selected, player color if playing and occupied, default otherwise
	var color = (segment.selected ? segment.color : defaultColor);
	color = (spot.player >= 0 ? colors[spot.player] : color);
	color = (spot.player >= 0 && (spot.highlighted || spot.selected) ? lightColors[spot.player] : color);
	color = (asFuture && spot.player >= 0 ? lightColors[spot.player] : color);
	
	// determine line width: thick if segment is selected or spot is selected or highlighted, default otherwise
	var lineWidth = (segment.selected || spot.selected || spot.highlighted ? 2 : ctx.lineWidth);

	// determine the center of the segment
	var x = (segment.column * columnWidth) + (hexagonSide/2);
	var y = (segment.row * rowHeight) + rowHeight;
	ctx.save();
	ctx.translate(x,y);

	// draw the spot at the correct place in the segment
	var oldWidth = ctx.lineWidth;
	var oldStrokeStyle = ctx.strokeStyle;
	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	if (pos != 0) {
		ctx.rotate(Math.PI*spotRotation);
		ctx.rotate((Math.PI*2)/6*(pos-1));
		ctx.translate(0, spotDist);
		ctx.rotate(-(Math.PI*2)/6*(pos-1));
		ctx.rotate(-Math.PI*spotRotation);
	}
	if (slices == 0 && spot.player == -1 && !spot.dead) { // spot is empty
		// draw a circle
		ctx.beginPath();
		ctx.arc(0, 0, spotRadius, 0, Math.PI*2, true);
		ctx.stroke();
	} else { // spot is in use
		for (var i = 0; i < 6; i++) {
			ctx.beginPath();
			ctx.arc(0, 0, spotRadius, 0, Math.PI/3, false);
			ctx.lineTo(0, 0);
			if (i < slices) {
				ctx.fill();
				ctx.beginPath();
				ctx.arc(0, 0, spotRadius, 0, Math.PI/3, false);
				ctx.stroke();
			} else {
				ctx.stroke();
			}
			ctx.rotate(Math.PI/3)
		}
		
		if (spot.growing || spot.dead) {
			// draw the "core"
			var radius = spot.growing ? spotGrowCoreRadius : spotDeadCoreRadius;
			ctx.fillStyle = spot.growing ? coreColor : defaultColor;
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, Math.PI*2, false);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, Math.PI*2, false);
			ctx.fill();
		}
	}
	
	ctx.lineWdith = oldWidth;
	ctx.strokeStyle = oldStrokeStyle;
	
	ctx.restore();
}
