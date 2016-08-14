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
var highlightHomeSegments = true;

var offsetX = 0;  // Will center the hexagons.
var offsetY = 0;
var desiredOffsetY = 20;

function hasSupport(elem) {
	return elem.getContext;
}

function createBoard() {
	atlantis = document.getElementById('atlantis');
  if (hasSupport(atlantis)) {
    ctx = atlantis.getContext('2d');
    ctx.save();
  }
}

function drawSegment(segment) {
  var color = segment.highlightPlayer !== undefined ? colors[segment.highlightPlayer] : defaultColor;
  var outlineColor = color;
  if (game.rules_version == "american" && highlightHomeSegments) {
    outlineColor = segment.home_player !== undefined ? colors[segment.home_player] : color;
  }
  drawHexagon(segment.center_x, segment.center_y, segment.highlight || outlineColor != defaultColor,
              outlineColor);
  for (point of segment.points) {
    drawPoint(point, segment.highlight, color);
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

function drawHexagon(center_x, center_y, highlight, color) {
  var screen_pos = screenCoordinates(center_x, center_y);

	// move to the given coordinates
	ctx.save();
	ctx.translate(screen_pos.x, screen_pos.y);

	// draw the hexagon
	ctx.fillStyle = highlight && color == defaultColor ? "#F2F2F2" : "white";
  ctx.lineWidth = highlight ? 3 : 1;
  ctx.strokeStyle = color;
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

function drawPoint(point, highlight, color) {
	var slices = point.tower != null ? point.tower.height : 0;
	var is_growing_point = point.tower != null ? point.tower.is_growing_point : 0;
  var is_dead = point.is_dead;
  var player = point.tower != null ? point.tower.player : -1;
  highlight = highlight || point.highlight;

	// Determine the center of the point.
  screen_pos = screenCoordinates(point.pos.x, point.pos.y);
	ctx.save();
	ctx.translate(screen_pos.x,screen_pos.y);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

	var color = (player >= 0 ? colors[player] : color);
  if (highlight) {
    if (player >= 0) {
      color = lightColors[player];
    } else {
      ctx.lineWidth = 2;
    }
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
    // Determine an X offset that put the board in the middle of screen.
    if (offsetX == 0 && offsetY == 0) {
      ctx.restore();
      ctx.save();
      var leftmost_x = Number.MAX_SAFE_INTEGER;
      var rightmost_x = -Number.MAX_SAFE_INTEGER;
      var lowest_y = Number.MAX_SAFE_INTEGER;
      var highest_y = -Number.MAX_SAFE_INTEGER;
      for (segment of allSegments.values()) {
        var screen_pos = screenCoordinates(segment.center_x, segment.center_y);
        if (screen_pos.x < leftmost_x) leftmost_x = screen_pos.x;
        if (screen_pos.x > rightmost_x) rightmost_x = screen_pos.x;
        if (screen_pos.y < lowest_y) lowest_y = screen_pos.y;
        if (screen_pos.y > highest_y) highest_y = screen_pos.y;
      }
      // Compute X.
      var width = (rightmost_x - leftmost_x) + 2 * hexagonSide;
      desiredOffsetX = ((atlantis.width - width) / 2) + hexagonSide;
      offsetX = desiredOffsetX - leftmost_x;
      // Compute Y.
      offsetY = (desiredOffsetY - lowest_y) + hexagonSide;  // A hexagonSide is slightly too much, but eh.
      totalHeight = (highest_y - lowest_y) + 2 * hexagonSide + 2 * desiredOffsetY;
      atlantis.height = totalHeight;
      ctx.translate(offsetX, offsetY);
    }

		ctx.clearRect(-offsetX, -offsetY, atlantis.offsetWidth, atlantis.offsetHeight);
    for (segment of allSegments.values()) {
      drawSegment(segment);
    }
  } else {
    alert("Sorry, your browser doesn't seem to support HTML5. Wait, really? :o");
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
    var centerPos = clone(screenCoordinates(point.pos.x, point.pos.y));
    centerPos.x += offsetX;
    centerPos.y += offsetY;
    if (coordsInCircle(canvasPos, centerPos, pointRadius)) {
      return point;
    }
  }
  return null;
}

function GetSegmentAt(canvas_pos) {
  // The relevant segment is the one where we're closest to the center point.
  var closest_dist = Number.MAX_SAFE_INTEGER;
  var closest_seg = null;
  for (var seg of allSegments.values()) {
    var center_pos = clone(screenCoordinates(seg.center_x, seg.center_y));
    center_pos.x += offsetX;
    center_pos.y += offsetY;
    var dist = Math.pow(canvas_pos.x - center_pos.x, 2) + Math.pow(canvas_pos.y - center_pos.y, 2);
    if (dist < closest_dist) {
      closest_dist = dist;
      closest_seg = seg;
    }
  }
  return closest_seg;
}


