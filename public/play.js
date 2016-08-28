var player_id = null;  // The ID of the player pressing these buttons.
var turn_player = 0;  // The ID of the player whose turn it is.

var play_fromPoint = null;
var play_toPoint = null;

var b_move;
var b_topple;
var b_reset;
var t_status;

function play_classic_mouseClicked(point) {
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
    enableBigButton(b_reset, "bad");
  }
  play_fromPoint = null;
  play_toPoint = null;
  redrawBoard();
}

var buffered_blocks_to_place = -1;
function play_american_numBlocksToPlace() {
  if (buffered_blocks_to_place >= 0) return buffered_blocks_to_place;
  var allowed_block_count = 7 + turn_player;
  var already_placed = CountPlacedBlocksForPlayer(game.players[turn_player].home_segment.center_x,
                                                  game.players[turn_player].home_segment.center_y,
                                                  turn_player);
  buffered_blocks_to_place = allowed_block_count - already_placed;
  return buffered_blocks_to_place;
}

function play_american_mouseClicked(point, e) {
  if (game.turn.turn_number > turn_player) {
    // After the first turn the american rules are the same as the classic rules.
    play_classic_mouseClicked(point);
    return;
  }

  // In the first turn, the american rules allow players to freely place N blocks.
  if (play_american_numBlocksToPlace() <= 0) {
    // The player isn't allowed to do anything except click "done" or "reset".
    return;
  }

  // The target point must be part of the player's home segment.
  if (point.segment.center_x != game.players[turn_player].home_segment.center_x ||
      point.segment.center_y != game.players[turn_player].home_segment.center_y) {
    return;
  }
  AddBlocksToTower(point, turn_player, 1, false);
  serializeBoard();
  buffered_blocks_to_place = -1;
  play_UpdateMessage();
  enableBigButton(b_reset, "bad");
  redrawBoard();
}

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

  if (game.rules_version == "classic" ) {
    play_classic_mouseClicked(point);
  } else if (game.rules_version == "american") {
    play_american_mouseClicked(point, e);
  }
}

function play_classic_mouseMoved(e) {
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

function play_american_mouseMoved(e) {
  if (game.turn.turn_number > turn_player) {
    // After the first turn the american rules are the same as the classic rules.
    play_classic_mouseMoved(e);
    return;
  }
  var posx = getMouseX(e);
  var posy = getMouseY(e);
  if (play_toPoint != null
      && play_toPoint.pos.x == posx
      && play_toPoint.pos.y == posy) return;  // Already showed this move.

  // Reset the board to its base-position, so we can show changes relative to that.
  unpackBoard();
  clearHighlights();

  var point = GetPointAt(new Position(posx, posy));
  if (point == null) return;

  // In the first turn, the american rules allow players to freely place N blocks.
  if (play_american_numBlocksToPlace() <= 0) {
     // The player isn't allowed to do anything except click "done" or "reset".
    return;
  }

  // The target point must be part of the player's home segment.
  if (point.segment.center_x != game.players[turn_player].home_segment.center_x ||
      point.segment.center_y != game.players[turn_player].home_segment.center_y) {
    redrawBoard();
    return;
  }

  // The point is valid.
  play_toPoint = point;

  // Simulate what would happen if the second click were to fall here.
  play_toPoint.highlight = true;
  AddBlocksToTower(point, turn_player, 1, true);
  redrawBoard();
}

function play_mouseMoved(e) {
  SetBlinkTitle(false);
  if (player_id != null && player_id != turn_player) {
    // It's a different player's turn. Do nothing.
    return;
  }
  if (game.rules_version == "classic") {
    play_classic_mouseMoved(e);
  } else if (game.rules_version == "american") {
    play_american_mouseMoved(e);
  }
}

function play_BoardChanged() {
  // Determine which player's turn it is.
  turn_player = game.turn.turn_number % game.players.length;
  var is_move_phase = game.turn.board_number == 0;
  player_name = game.players[turn_player].name;
  if (player_id != null && player_id != turn_player) {
    // It's a different player's turn.
    disableBigButton(b_move);
    disableBigButton(b_topple);
    disableBigButton(b_reset);
  } else {
    // It's our turn, either on a shared screen or not.
    if (is_move_phase) {
      enableBigButton(b_move, "good");
      disableBigButton(b_topple);
      disableBigButton(b_reset);
    } else {
      disableBigButton(b_move);
      enableBigButton(b_topple, "good");
      disableBigButton(b_reset);
    }
  }

  // Determine which navigation buttons should be enabled. Start by assuming all are enabled.
  enableSmallButton(b_navFirst);
  enableSmallButton(b_navPrev);
  enableSmallButton(b_navNext);
  enableSmallButton(b_navLast);
  if (game.turn.turn_number == current_turn_number && game.turn.board_number == current_board_number) {
    // We're looking at the latest board in the game. Leave the play-buttons as they are, but disable
    // forward turn navigation.
    disableSmallButton(b_navNext);
    disableSmallButton(b_navLast);
  } else {
    // We're looking at some historical turn. Disable all play-buttons.
    disableBigButton(b_move);
    disableBigButton(b_topple);
    disableBigButton(b_reset);
  }
  if (game.turn.turn_number == 0 && game.turn.board_number == 0) {
    // We're looking at the first board in the game. Backwards buttons should be disabled.
    disableSmallButton(b_navFirst);
    disableSmallButton(b_navPrev);
  }
  play_UpdateMessage();

  if (player_id == turn_player && game.turn.board_number == 0) {
    // Users are playing on different screens. Let the user know that it became their turn.
    PlayNotificationSound();
    SetBlinkTitle(true);
  }
}

function play_UpdateMessage() {
  var is_move_phase = game.turn.board_number == 0;
  var color_msg = "(playing <font color=\"" + colors[turn_player] + "\">"
                  + colorNames[turn_player] + "</font>).";
  var move_msg1 = "It's " + player_name + "'s turn " + color_msg;
  var move_msg2 = "";
  var topple_msg = player_name + " is toppling.";
  if (player_id == null || player_id == turn_player) {
    // It's our turn, either on a shared screen or not.
    move_msg2 = "<br/>Press \"Finish move\" when you're done.";
    if (player_id != null) {
      // This screen has one player. Address them as "you".
      move_msg1 = "It's your turn to move " + color_msg;
      topple_msg = "You're toppling. Press \"Topple / Grow\".";
    }
  }

  // If this is the first move of an american-style game, also count the number of blocks still to move.
  buffered_blocks_to_place = -1;
  if (game.rules_version == "american" && game.turn.turn_number <= turn_player) {
    var block_remaining_count = play_american_numBlocksToPlace();
    if (block_remaining_count > 1) {
      move_msg1 = move_msg1 + " Place " + block_remaining_count + " more blocks.";
    } else if (block_remaining_count == 1) {
      move_msg1 = move_msg1 + " Place 1 more block.";
    } else {
      // The player just needs to press finish. The game already tells them that.
    }
  } else {
    highlightHomeSegments = false;
  }

  var historical_msg = "";
  if (game.turn.turn_number != current_turn_number || game.turn.board_number != current_board_number) {
    // We're looking at some historical turn.
    historical_msg = "Looking back at turn " + game.turn.turn_number +
                     ", board " + game.turn.board_number + " -- ";
    move_msg2 = "";
  }

  if (is_move_phase) {
    t_status.innerHTML = historical_msg + move_msg1 + move_msg2;
  } else {
    t_status.innerHTML = historical_msg + topple_msg;
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
  disableBigButton(b_move);  // To prevent double-click.
  if (game.rules_version == "american") {
    american_initialBlocksPlaced = 0;
  }
  play_nextStep(false, play_ToppleOrGrow);
}

function play_ToppleOrGrow() {
  disableBigButton(b_topple);  // To prevent double-click.
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

