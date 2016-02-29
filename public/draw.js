// The context used for drawing.
var ctx = null;

var hexagonSide = 100;
var pointRadius = hexagonSide * 0.23;
var pointGrowCoreRadius = pointRadius / 2;
var pointDeadCoreRadius = pointRadius / 4;
var pointRotation = -10.893;  // Degrees.
var pointDist = hexagonSide * 0.655

var defaultColor = "black";
var coreColor = "white";
var colors = ["red", "blue", "green", "orange", "yellow", "pink"];
var lightColors = ["#FF6666", "#6666FF", "#33CC33", "#FFCC00", "GoldenRod", "HotPink"]
var showCoords = true;

var offsetX;  // Pixels.
var offsetY;  // Pixels.

function hasSupport(elem) {
	return elem.getContext;
}

function createBoard() {
	atlantis = document.getElementById('atlantis');
  if (hasSupport(atlantis)) {
    ctx = atlantis.getContext('2d');
    ctx.save();
    offsetX = 200;
    offsetY = atlantis.height / 2;
    ctx.translate(offsetX, offsetY);
  }
}

function drawSegment(segment) {
  drawHexagon(segment.center_x, segment.center_y, ctx.lineWidth, defaultColor);
  for (point of segment.points) {
    drawPoint(point);
  }
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

function drawHexagon(center_x, center_y, lineWidth, color) {
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
	var slices = point.tower != null ? point.tower.height : 0;
	var is_growing_point = point.tower != null ? point.tower.is_growing_point : 0;
  var is_dead = point.is_dead;
  var player = point.tower != null ? point.tower.player : -1;
  var highlight = point.highlight;
	
	// Determine the center of the point.
  screen_pos = screenCoordinates(point.pos.x, point.pos.y);
	ctx.save();
	ctx.translate(screen_pos.x,screen_pos.y);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

	var color = (player >= 0 ? colors[player] : defaultColor);
  if (highlight) {
    color = lightColors[player];
  }
	ctx.strokeStyle = color;
	ctx.fillStyle = color;

	if (slices == 0 && player == -1 && !is_dead) { // point is empty
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
		
		if (is_growing_point || is_dead) {
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

function redrawBoard() {
	if (hasSupport(atlantis)) {
		ctx.clearRect(-offsetX, -offsetY, atlantis.offsetWidth, atlantis.offsetHeight);
    for (segment of allSegments.values()) {
      drawSegment(segment);
    }
  }
}

function coordsInCircle(coordsPos, centerPos, radius) {
  var distX = Math.abs(coordsPos.x - centerPos.x);
  var distY = Math.abs(coordsPos.y - centerPos.y);
  var dist = Math.sqrt(distX * distX + distY*distY);
  return dist < radius;
}

function GetPointAt(canvasPos) {
  // TODO(rjhacks): this can be optimized. For example, we could first find likely
  //                candidate segements, then only scan the appropriate points.
  for (var point of allPoints.values()) {
    centerPos = clone(screenCoordinates(point.pos.x, point.pos.y));
    centerPos.x += offsetX;
    centerPos.y += offsetY;
    if (coordsInCircle(canvasPos, centerPos, pointRadius)) {
      return point;
    }
  }
  return null;
}
