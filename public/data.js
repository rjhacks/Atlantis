var atlantisFirebaseRef = new Firebase("https://atlantis-game.firebaseio.com/");

var game_id = null;
var fb_game = null;
var fb_boards = null;
var game = {moves: -1};
var board = {};

var connection_retries = 0;

function createGame() {
  fb_game = atlantisFirebaseRef.child("games/").push(game);
  game_id = fb_game.key();
  fb_boards = atlantisFirebaseRef.child("boards/" + game_id + "/board_history/");
  commitMove();  // Commits the initial board.
  console.log("created game " + game_id);
  listenForMove();
}

// Load an existing game.
function openGame() {
  console.log("Opening game with ID " + game_id);
  fb_game = atlantisFirebaseRef.child("games/" + game_id);
  fb_boards = atlantisFirebaseRef.child("boards/" + game_id + "/board_history/");
  listenForMove();
}

function listenForMove() {
  fillURLBox();  // TODO(rjh): for demo purposes only, remove this.
  fb_game.on("value", function(gameSnapshot) {
    console.log("Game change detected");
    game = gameSnapshot.val();
    fb_boards.child(game.moves + '').once("value", function(boardSnapshot) {
      board = boardSnapshot.val();
      unpackBoard();
    });
  }, function(errorObject) { 
    console.log("games.on failed: " + errorObject.code)
    if (connection_retries++ < 1) {
      setTimeout(listenForMove, 100);  // Try again in 100ms.
    }
  });
}

function unpackBoard() {
  segments = [];
  allPoints = new Map();
  for (segment of board.segments) {
    segments.push(new Segment(segment.x, segment.y));
  }
  if (typeof board.towers != "undefined") {
    for (tower of board.towers) {
      var pos = tower.position;
      getPoint(pos.x, pos.y).tower = clone(tower);
    }
  }
  if (typeof board.dead_points != "undefined") {
    for (dead_point of board.dead_points) {
      var pos = dead_point.position;
      getPoint(pos.x, pos.y).is_dead = true;
    }
  }
  redrawBoard();
}

// Writes the current state of the board out as a new move.
function commitMove() {
  board.segments = [];
  board.towers = [];
  board.dead_points = [];
  for (segment of segments) {
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
        t.position = point.pos;
        board.towers.push(t);
      }
    }
  }
  updatedMoves = game.moves + 1;
  fb_boards.child(updatedMoves + '').set(board);
  fb_game.child("moves").set(updatedMoves);
}

