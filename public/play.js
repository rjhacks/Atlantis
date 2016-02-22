var play_fromPoint = null;
var play_toPoint = null;

function getMouseX(e) {
  var posx = 0;
  if (!e) var e = window.event;
  if (e.pageX)  {
    posx = e.pageX;
  }
  else if (e.clientX)   {
    posx = e.clientX + document.body.scrollLeft
      + document.documentElement.scrollLeft;
  }

  posx = posx - atlantis.offsetLeft;
  return posx;
}

function getMouseY(e) {
  var posy = 0;
  if (!e) var e = window.event;
  if (e.pageY)  {
    posy = e.pageY;
  }
  else if (e.clientY)   {
    posy = e.clientY + document.body.scrollTop
      + document.documentElement.scrollTop;
  }

  posy = posy - atlantis.offsetTop;
  return posy;
}

function play_mouseClicked(e) {
  // We need to first reset the board to its base-position, since tentative moves
  // may have been displayed.
  unpackBoard();
  play_fromPoint = play_fromPoint != null ? getPoint(play_fromPoint.pos.x, play_fromPoint.pos.y) : null;

  var posx = getMouseX(e);
  var posy = getMouseY(e); 
  var point = GetPointAt(new Position(posx, posy));
  if (point == null) {
    play_fromPoint = null;
    play_toPoint = null;
    return;
  }

  // First click: just set the point we're moving from.
  if (play_fromPoint == null) {
    play_fromPoint = point;
    play_fromPoint.highlight = true;
    redrawBoard();
    return;
  }

  if (ApplyMove(play_fromPoint.pos, point.pos, false /* showTrail */)) {
    serializeBoard();
  }
  play_fromPoint = null; 
  play_toPoint = null;

  redrawBoard();
}

function play_mouseMoved(e) {
  if (play_fromPoint == null) return;

  var posx = getMouseX(e);
  var posy = getMouseY(e); 
  if (play_toPoint != null 
      && play_toPoint.pos.x == posx 
      && play_toPoint.pos.y == posy) return;  // Already showed this move.

  // Reset the board to its base-position, so we can show changes relative to that.
  unpackBoard();
  play_fromPoint = getPoint(play_fromPoint.pos.x, play_fromPoint.pos.y);
  play_fromPoint.highlight = true;

  var point = GetPointAt(new Position(posx, posy));
  play_toPoint = point;
  if (point == null) {
    // Nothing would happen if we click here.
    redrawBoard();
    return;
  }

  // Simulate what would happen if the second click were to fall here.
  ApplyMove(play_fromPoint.pos, point.pos, true /* showTrail */);

  redrawBoard();
}

function play_SetUp() {
  atlantis.onclick = play_mouseClicked; 
  atlantis.onmousemove = play_mouseMoved;
}

function play_FinishMove() {
  // Commit the state of the board as it is after this move phase.
  commitMove();

  // Do the topple and grow phases.
  var b = document.getElementById("stepButton");
  b.onclick = play_ToppleOrGrow;
  b.value = "Topple/Grow";
  play_ToppleOrGrow();
}

function play_ToppleOrGrow() {
  var player_id = 0;
  var topples = DoOneToppleRound(player_id);
  if (!topples) {
    GrowAll(player_id);
  }
  commitMove();
  if (!topples || (!HasGrowingPoints(player_id) && !PlayerWillTopple(player_id))) {
    var b = document.getElementById("stepButton");
    b.onclick = play_FinishMove;
    b.value = "Finish move";
  }
}

