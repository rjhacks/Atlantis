// This file contains the methods and data structures used to represent and
// draw an Atlantis board based on a JSON input.
//
// TODO: add support for displaying the board-progression represented in the
//       "turns" field declared in the schema.

var hexagonSide = 100;
var pointRadius = hexagonSide * 0.23;
var pointGrowCoreRadius = pointRadius / 2;
var pointDeadCoreRadius = pointRadius / 4;
var pointRotation = -10.893;  // Degrees.
var pointDist = hexagonSide * 0.655

var defaultColor = "black";
var coreColor = "white";
var colors = ["red", "blue", "green", "orange", "yellow", "pink"];
var showCoords = true;

// Maps Position.str() -> Point
var allPoints = new Map();
function getPoint(pos) {
  var p = new Position(pos.x, pos.y);
  return allPoints.get(p.str());
}
function setPoint(point) {
  allPoints.set(point.pos.str(), point);
}

function Segment(ctx, center_x, center_y) {
	this.ctx = ctx;
	this.center_x = center_x;
  this.center_y = center_y;
	this.points = [new Point(ctx, this, center_x - 1, center_y - 1),
                 new Point(ctx, this, center_x - 1, center_y),
                 new Point(ctx, this, center_x, center_y - 1),
                 new Point(ctx, this, center_x, center_y),
                 new Point(ctx, this, center_x, center_y + 1),
                 new Point(ctx, this, center_x + 1, center_y),
                 new Point(ctx, this, center_x + 1, center_y + 1)];
  for (point of this.points) {
    setPoint(point);
  }
                  
	this.draw = function() {
		drawHexagon(ctx, this.center_x, this.center_y, ctx.lineWidth, defaultColor);
		for (point of this.points) {
			point.draw();
		}
	}
}

function Position(x, y) {
  this.x = x;
  this.y = y;
  this.str = function() { return this.x + "," + this.y; }
}

function Tower(player, height, is_growing_point) {
  this.player = player;
  this.height = height;
  this.is_growing_point = is_growing_point;
}

function Point(ctx, segment, x, y) {
	this.ctx = ctx;
	this.segment = segment;
  this.pos = new Position(x, y);
  this.tower = null;
  this.is_dead = false;

	this.draw = function() {
		drawPoint(this);
	}

	this.toString = function() { return this.pos.str(); }
}

function hasSupport(elem) {
	return elem.getContext;
}

// Computes the pixel-x,y coordinates on a screen based on the point-x,y
// coordinates of a point or segment, assuming point (0,0) to live at
// pixel (0,0).
function screenCoordinates(point_x, point_y) {
  // To get to a point, we start at 0,0 (which is assumed to be the origin of
  // the current context), and walk down two lines:
  // - First, we walk down the X-line. That means walking 'point_x' steps of 
  //   'pointDist' pixels along a line that's angled upwards by 'pointRotation'
  //   degrees relative to horizontal.
  // - Next, we walk down the Y-line. That means walking 'point_y' steps of
  //   'pointDist' pixels along a line that's angled upwards by 120 degrees
  //   relative to the X-line.

  // Travel down the X-line.
  hypothenuse = pointDist * point_x;
  screen_x = hypothenuse * Math.cos(Math.PI*2*(pointRotation/360));
  screen_y = hypothenuse * Math.sin(Math.PI*2*(pointRotation/360));

  // Travel down the Y-line.
  angle = pointRotation - 120;
  hypothenuse = pointDist * point_y;
  screen_x += hypothenuse * Math.cos(Math.PI*2*(angle/360));
  screen_y += hypothenuse * Math.sin(Math.PI*2*(angle/360));
  return new Position(screen_x, screen_y);
}

function drawHexagon(ctx, center_x, center_y, lineWidth, color) {
  var screen_pos = screenCoordinates(center_x, center_y);

	// move to the given coordinates
	ctx.save();
	ctx.translate(screen_pos.x, screen_pos.y);

	// draw the hexagon
	ctx.fillStyle = "white";
	var x = hexagonSide;
	var y = 0;
	ctx.beginPath();
	ctx.moveTo(x,y);
	for (var i = 0; i < 6; i++) {
		x += hexagonSide*Math.cos((Math.PI*2/6)*(i+2));
		y += hexagonSide*Math.sin((Math.PI*2/6)*(i+2));
		ctx.lineTo(x,y);
	}
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(x,y);
	for (var i = 0; i < 6; i++) {
		x += hexagonSide*Math.cos((Math.PI*2/6)*(i+2));
		y += hexagonSide*Math.sin((Math.PI*2/6)*(i+2));
		ctx.lineTo(x,y);
	}
	ctx.stroke();

	// jump back to the original coordinates
	ctx.restore();
}

function drawPoint(point) {
	var ctx = point.ctx;
	var slices = point.tower != null ? point.tower.height : 0;
	var is_growing_point = point.tower != null ? point.tower.is_growing_point : 0;
  var player = point.tower != null ? point.tower.player : -1;
	
	// Determine the center of the point.
  screen_pos = screenCoordinates(point.pos.x, point.pos.y);
	ctx.save();
	ctx.translate(screen_pos.x,screen_pos.y);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

	var color = (player >= 0 ? colors[player] : defaultColor);
	ctx.strokeStyle = color;
	ctx.fillStyle = color;

	if (slices == 0 && player == -1 && !point.is_dead) { // point is empty
		// draw a circle
		ctx.beginPath();
		ctx.arc(0, 0, pointRadius, 0, Math.PI*2, true);
		ctx.stroke();
	} else { // point is in use
		for (var i = 0; i < 6; i++) {
			ctx.beginPath();
			ctx.arc(0, 0, pointRadius, 0, Math.PI/3, false);
			ctx.lineTo(0, 0);
			if (i < slices) {
				ctx.fill();
				ctx.beginPath();
				ctx.arc(0, 0, pointRadius, 0, Math.PI/3, false);
				ctx.stroke();
			} else {
				ctx.stroke();
			}
			ctx.rotate(Math.PI/3)
		}
		
		if (is_growing_point || point.is_dead) {
			// draw the "core"
			var radius = is_growing_point ? pointGrowCoreRadius : pointDeadCoreRadius;
			ctx.fillStyle = is_growing_point ? coreColor : defaultColor;
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, Math.PI*2, false);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, Math.PI*2, false);
			ctx.fill();
		}
	}
	
  if (showCoords) {
    ctx.strokeStyle = defaultColor;
    ctx.fillStyle = defaultColor;
    ctx.fillText(point.pos.x + "," + point.pos.y, 0, 0);
  }

	ctx.restore();
}

function loadboard() {
	atlantis = document.getElementById('atlantis');
  if (hasSupport(atlantis)) {
    var ctx = atlantis.getContext('2d');
    ctx.save();
    ctx.translate(200, atlantis.height/2);

    // Validate that the serialized_board is in fact a valid board according
    // to our schema.
    var schema = JSON.parse(serialized_schema);
    var data = JSON.parse(serialized_board);
    if (!tv4.validate(data, schema, false, true)) {
      console.log("Invalid board JSON: " + tv4.error);
      return;
    }
    
    // Construct our board based on the received JSON, then draw it.
    var segments = [];
    for (segment of data.board.segments) {
      segments.push(new Segment(ctx, segment.x, segment.y));
    }
    for (tower of data.board.towers) {
      getPoint(tower.position).tower = tower;
    }
    for (dead_point of data.board.dead_points) {
      getPoint(dead_point.position).is_dead = true;
    }
    for (segment of segments) {
      segment.draw();
    }
  }
}

