var atlantisFirebaseRef = new Firebase("https://atlantis-game.firebaseio.com/");

var game_id = null;
var fb_game = null;
var fb_boards = null;
var game = {turn: {turn_number: -1, board_number: -1}};
var board = {};

var connection_retries = 0;

var boardListeners = [];

function onBoardChange(func) {
  boardListeners.push(func);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createGame() {
  fb_game = atlantisFirebaseRef.child("games/").push(game);
  game_id = fb_game.key();
  fb_turns = atlantisFirebaseRef.child("boards/" + game_id + "/turn_history/");
  CommitTurn();  // Commits the initial board.
  listenForMove();
}

// Load an existing game.
function openGame() {
  fb_game = atlantisFirebaseRef.child("games/" + game_id);
  fb_turns = atlantisFirebaseRef.child("boards/" + game_id + "/turn_history/");
  listenForMove();
}

function reloadBoard() {
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

function listenForMove() {
  fillURLBox();  // TODO(rjh): for demo purposes only, remove this.
  fb_game.on("value", function(gameSnapshot) {
    game = gameSnapshot.val();
    reloadBoard();
  }, function(errorObject) { 
    console.log("games.on failed: " + errorObject.code)
    if (connection_retries++ < 1) {
      setTimeout(listenForMove, 100);  // Try again in 100ms.
    }
  });
}

function clearState() {
  allSegments = new Map();
  allPoints = new Map();
}

function unpackBoard() {
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

function commitGame() {
  serializeBoard();
  var board_path = game.turn.turn_number + "/board_history/" + game.turn.board_number;
  fb_turns.child(board_path).set(board);
  fb_game.child("turn").set(game.turn);
}

function CommitBoard() {
  game.turn.board_number++;
  commitGame();
}

function CommitTurn() {
  game.turn.turn_number++;
  game.turn.board_number = 0;
  commitGame();
}

