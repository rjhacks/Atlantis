var player_id = null;  // The ID of the player pressing these buttons.
var turn_player = 0;  // The ID of the player whose turn it is.

var play_fromPoint = null;
var play_toPoint = null;

var b_move;
var b_topple;
var b_reset;
var t_status;

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
  clearHighlights();
  play_fromPoint = play_fromPoint != null ? getPoint(play_fromPoint.pos.x, play_fromPoint.pos.y) : null;

  var posx = getMouseX(e);
  var posy = getMouseY(e); 
  var point = GetPointAt(new Position(posx, posy));
  if (point == null) return;  // Mis-click. Do nothing.

  // First click: just set the point we're moving from.
  if (play_fromPoint == null) {
    if (point.tower == null) return;  // Invalid first click; point doesn't have a tower.
    if (point.tower.player != turn_player) return;  // Invalid first click; not that player's turn.
    if (point.segment.moved) return;  // Invalid point: segment has already moved.
    play_fromPoint = point;
    play_fromPoint.highlight = true;
    redrawBoard();
    return;
  }

  if (ApplyMove(play_fromPoint.pos, point.pos, false /* tentative */)) {
    serializeBoard();
    b_reset.disabled = false;
    b_reset.className = "big-btn bad";
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

  var point = GetPointAt(new Position(posx, posy));
  if (point == null) return;  // Nothing happens if we click here.
  play_toPoint = point;

  // Reset the board to its base-position, so we can show changes relative to that.
  unpackBoard();
  clearHighlights();

  // Simulate what would happen if the second click were to fall here.
  play_fromPoint.highlight = true;
  ApplyMove(play_fromPoint.pos, point.pos, true /* tentative */);

  redrawBoard();
}

function play_BoardChanged() {
  // Determine which player's turn it is.
  turn_player = game.turn.turn_number % game.players.length;
  if (game.turn.board_number == 0) {
    // We're in the move-phase.
    b_move.disabled = false;
    b_move.className = "big-btn good";
    b_topple.disabled = true;
    b_topple.className = "big-btn disabled";
    b_reset.disabled = true;
    b_reset.className = "big-btn disabled";
    t_status.innerHTML = "It's " + game.players[turn_player].name + "'s turn to move.";
  } else {
    // We're in the topple/grow phase.
    b_move.disabled = true;
    b_move.className = "big-btn disabled";
    b_topple.disabled = false;
    b_topple.className = "big-btn good";
    b_reset.disabled = true;
    b_reset.className = "big-btn disabled";
    t_status.innerHTML = game.players[turn_player].name + " is toppling.";
  }
}

function play_SetUp() {
  b_move = document.getElementById("finishButton");
  b_topple = document.getElementById("toppleButton");
  b_reset = document.getElementById("resetButton");
  t_status = document.getElementById("messageBox");
  atlantis.onclick = play_mouseClicked; 
  atlantis.onmousemove = play_mouseMoved;
  onBoardChange(play_BoardChanged);
}

function play_FinishMove() {
  // Perform the move-step, and progress to play_ToppleOrGrow iff 
  // there is something to do there. Have the "Finish move" button
  // disabled for that period.
  b_move.disabled = true;
  b_move.className = "big-btn disabled";
  play_nextStep(false, play_ToppleOrGrow);
}

function play_ToppleOrGrow() {
  if (PlayerWillTopple(turn_player)) {
    DoOneToppleRound(turn_player);
    play_nextStep(false);
  } else if (HasGrowingPoints(turn_player)) {
    GrowAll(turn_player);
    play_nextStep(true);
  }
}

function play_Reset() {
  reloadBoard();
}

// Returns true if the next step in the turn is a topple or grow, or false if 
// the turn is finished.
function play_nextStep(have_grown, readyForNextStep) {
  // If there are further actions to do in this turn (topple or grow), commit
  // the current board, but not yet the turn. If we've done everything there
  // is to do for this turn, commit the turn.
  var will_topple = PlayerWillTopple(turn_player);
  var has_growing_points = HasGrowingPoints(turn_player);
  if (!have_grown && (will_topple || has_growing_points)) {
    // The board is guaranteed to change at least one more time. Store the
    // current state, and wait for the player to want to take the next step.
    CommitBoard(readyForNextStep);
    return;
  } 
  // End of turn. We won't call readyForNextStep().
  CommitTurn();
}

