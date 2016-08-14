var atlantisFirebaseRef = new Firebase("https://atlantis-game.firebaseio.com/");

var game_id = null;
var fb_game = null;
var fb_boards = null;
var game = {turn: {turn_number: -1, board_number: -1}, players: []};
var board = {};
var current_turn_number = -1;
var current_board_number = -1;

var connection_retries = 0;

var boardListeners = [];

var writeInProgress = false;

function onBoardChange(func) {
  boardListeners.push(func);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createGame(onComplete) {
  fb_game = atlantisFirebaseRef.child("games/").push(game);
  game_id = fb_game.key();
  fb_turns = atlantisFirebaseRef.child("boards/" + game_id + "/turn_history/");
  CommitTurn(onComplete);  // Commits the initial board.
}

// Load an existing game.
function openGame() {
  fb_game = atlantisFirebaseRef.child("games/" + game_id);
  fb_turns = atlantisFirebaseRef.child("boards/" + game_id + "/turn_history/");
  listenForMove();
}

function reloadBoard() {
  if (game.turn.turn_number > current_turn_number) {
    current_turn_number = game.turn.turn_number;
    current_board_number = game.turn.board_number;
  } else if (game.turn.turn_number == current_turn_number && 
             game.turn.board_number > current_board_number) {
    current_board_number = game.turn.board_number;
  }
  var board_path = game.turn.turn_number + "/board_history/" + game.turn.board_number;
  fb_turns.child(board_path).once("value", function(boardSnapshot) {
    clearState();
    board = boardSnapshot.val();
    unpackBoard();
    for (listener of boardListeners) {
      listener();
    }
    redrawBoard();
  });
}

function showFirstBoard() {
  game.turn.turn_number = 0;
  game.turn.board_number = 0;
  reloadBoard();
}

function showPreviousBoard() {
  if (game.turn.board_number > 0) {
    game.turn.board_number -= 1;
    reloadBoard();
  } else if (game.turn.turn_number > 0) {
    game.turn.turn_number -= 1;
    // Find the last board in the previous turn, and go there.
    var board_history_path = game.turn.turn_number + "/board_history";
    fb_turns.child(board_history_path).limitToLast(1).once("child_added", function(snapshot) {
      game.turn.board_number = snapshot.key();
      reloadBoard();
    });
  }
}

function showNextBoard() {
  if (game.turn.turn_number == current_turn_number &&
      game.turn.board_number == current_board_number) {
    return;
  }

  // Find the last board in this turn, so we know whether we need to go to the next turn.
  var board_history_path = game.turn.turn_number + "/board_history";
  fb_turns.child(board_history_path).limitToLast(1).once("child_added", function(snapshot) {
    last_turn_board = snapshot.key();
    if (game.turn.board_number == last_turn_board) {
      // This was the last board. Go to the next turn.
      game.turn.turn_number += 1;
      game.turn.board_number = 0;
    } else {
      game.turn.board_number += 1;
    }
    reloadBoard();
  });
}

function showLastBoard() {
  game.turn.turn_number = current_turn_number;
  game.turn.board_number = current_board_number;
  reloadBoard();
}

function listenForMove() {
  fb_game.on("value", function(gameSnapshot) {
    game = gameSnapshot.val();
    reloadBoard();
  }, function(errorObject) { 
    console.log("games.on failed: " + errorObject.code)
  });
}

function clearState() {
  allSegments = new Map();
  allPoints = new Map();
}

function unpackBoard() {
  if (board.segments === undefined || board.segments == null) {
    // Board isn't loaded yet.
    return;
  }
  for (segment of board.segments) {
    if (getSegment(segment.x, segment.y) === null) {
      // Does setSegment() itself.
      new Segment(segment.x, segment.y);
    }
  }
  var remainingTowerPositions = new Set();
  if (typeof board.towers != "undefined") {
    for (tower of board.towers) {
      var pos = tower.position;
      var point = getPoint(pos.x, pos.y);
      if (point.tower === null) point.tower = {};
      point.tower.player = tower.player;
      point.tower.height = tower.height;
      point.tower.is_growing_point = tower.is_growing_point;
      remainingTowerPositions.add(point.pos);
    }
  }
  for (var point of allPoints.values()) {
    if (!remainingTowerPositions.has(point.pos)) {
      point.tower = null;
    }
  }
  if (typeof board.dead_points != "undefined") {
    for (dead_point of board.dead_points) {
      var pos = dead_point.position;
      getPoint(pos.x, pos.y).is_dead = true;
    }
  }
  for (var i = 0; i < game.players.length; i++) {
    if (game.players[i].home_segment === undefined) continue;
    var home_seg = getSegment(game.players[i].home_segment.center_x,
                              game.players[i].home_segment.center_y);
    home_seg.home_player = i;
  }
}

function serializeBoard() {
  board = {};
  board.segments = [];
  board.towers = [];
  board.dead_points = [];
  for (segment of allSegments.values()) {
    var s = {};
    s.x = segment.center_x;
    s.y = segment.center_y;
    board.segments.push(s);
    for (point of segment.points) {
      if (point.is_dead) {
        var dead_point = {};
        dead_point.position = point.pos;
        board.dead_points.push(dead_point);
      } else if (point.tower != null) {
        // For display purposes, we occasionally show 0-height non-growing points.
        // Don't send these to the server. We can send 0-height growing points, as
        // these exist during the toppling phase.
        if (point.tower.height == 0 && !point.tower.is_growing_point) continue;
        var t = clone(point.tower);
        delete t.num_moved_blocks;  // No need to persist this rules-hint.
        t.position = point.pos;
        board.towers.push(t);
      }
    }
  }
}

function commitGame(onComplete) {
  if (writeInProgress) {
    var e = new Error("BUG: writes already (still) in progress but new commitGame()");
    console.log(e.stack);
  }
  writeInProgress = true;
  serializeBoard();
  var board_path = game.turn.turn_number + "/board_history/" + game.turn.board_number;
  fb_turns.child(board_path).set(board, function() {
    // Only update the game once the board has been written down.
    fb_game.child("turn").set(game.turn, function() {
      writeInProgress = false; 
      if (onComplete !== undefined) onComplete();
    });
  });
}

function CommitBoard(onComplete) {
  game.turn.board_number++;
  commitGame(onComplete);
}

function CommitTurn(onComplete) {
  game.turn.turn_number++;
  game.turn.board_number = 0;
  commitGame(onComplete);
}

