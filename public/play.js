var player_id = null;  // The ID of the player pressing these buttons.
var turn_player = 0;  // The ID of the player whose turn it is.

var play_fromPoint = null;
var play_toPoint = null;

var b_move;
var b_topple;
var b_reset;
var t_status;

function play_mouseClicked(e) {
  if (player_id != null && player_id != turn_player) {
    // It's a different player's turn. Do nothing.
    return;
  }

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
    enableButton(b_reset, "bad");
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
  var is_move_phase = game.turn.board_number == 0;
  player_name = game.players[turn_player].name;
  var color_msg = "(playing <font color=\"" + colors[turn_player] + "\">" 
                  + colors[turn_player] + "</font>).";
  var move_msg = "It's " + player_name + "'s turn " + color_msg;
  var topple_msg = player_name + " is toppling.";
  if (player_id != null && player_id != turn_player) {
    // It's a different player's turn.
    disableButton(b_move);
    disableButton(b_topple);
    disableButton(b_reset);
  } else {
    // It's our turn, either on a shared screen or not.
    if (is_move_phase) {
      enableButton(b_move, "good");
      disableButton(b_topple);
      disableButton(b_reset);
    } else {
      disableButton(b_move);
      enableButton(b_topple, "good");
      disableButton(b_reset);
    }
    if (player_id != null) {
      // This screen has one player. Address them as "you".
      move_msg = "It's your turn to move " + color_msg + "<br/>Press \"Finish move\" when you're done.";
      topple_msg = "You're toppling. Press \"Topple / Grow\".";
    }
  }
  if (is_move_phase) {
    t_status.innerHTML = move_msg;
  } else {
    t_status.innerHTML = topple_msg; 
  }
}

function play_Begin() {
  atlantis.onclick = play_mouseClicked; 
  atlantis.onmousemove = play_mouseMoved;
  onBoardChange(play_BoardChanged);
}

function play_FinishMove() {
  // Perform the move-step, and progress to play_ToppleOrGrow iff 
  // there is something to do there. Have the "Finish move" button
  // disabled for that period.
  disableButton(b_move);  // To prevent double-click.
  play_nextStep(false, play_ToppleOrGrow);
}

function play_ToppleOrGrow() {
  disableButton(b_topple);  // To prevent double-click.
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

