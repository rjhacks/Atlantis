// The methods in this file won't have a place in the final game, but
// allow us to see some of the other mechanics in action for now.

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function SetUp() {
  tower = {player: 0, height: 1, is_growing_point: false};
  segment = new Segment(0, 0);
  for (point of segment.points) {
    point.tower = clone(tower);
  }
  segments.push(segment);

  segment = new Segment(1,-2);
  segments.push(segment);
  segment = new Segment(3,1);
  segments.push(segment);

  tower.player = 1;
  segment = new Segment(4,-1);
  for (point of segment.points) {
    point.tower = clone(tower);
  }
  segments.push(segment);
  game.players = [ {"name": "RJ"}, {"name": "Benjamin"} ];
  game.rules_version = "classic";
}

// Raise the tower on 0,0 by moving neighbouring blocks onto it, until it
// topples, then grow it until it topples again. All this does is show how
// we can represent different board states (towers, growing points, dead
// points) and commit a changed board as a move.
function DoMove() {
  var toPoint = getPoint(0,0);

  var is_growing_point = toPoint.tower != null && toPoint.tower.is_growing_point;
  if (!is_growing_point && !toPoint.is_dead) {
    // This is a normal non-growing non-dead point. Let's move some stuff onto it.
    // Pick a neighbour to move from: this'll be the first tower-holding neighbour
    // in the point's segment.
    var context = { done: false };
    context.toPoint = toPoint;
    forEachNeighbour(0, 0, context, function(x, y, context) {
      if (context.done) return;
      fromPoint = getPoint(x, y);
      if (fromPoint.tower == null) return;
      MoveBlocks(fromPoint, context.toPoint, 1);
      RemoveBlocksFromTower(fromPoint, 1);
      context.done = true;
    });
  }

  commitMove();

  if (PlayerWillTopple(0 /* player */)) {
    var b = document.getElementById("stepButton");
    b.onclick = DoToppleOrGrow;
    b.value = "Do Topple/Grow";
  }
}

function DoToppleOrGrow() {
  var topples = DoOneToppleRound(0 /* player */);
  if (!topples) {
    GrowAll(0 /* player */);

    // A normal game would always go back to the 'move' phase now, but this demo
    // only does that if the one point we're moving on is still alive.
    var point = getPoint(0,0);
    var is_growing_point = point.tower != null && point.tower.is_growing_point;
    if (!point.is_dead && !is_growing_point) {
      var b = document.getElementById("stepButton");
      b.onclick = DoMove;
      b.value = "Do Move";
    }
  }
  commitMove();
}

function fillURLBox() {
  var url = document.URL;
  if (url.indexOf("?") == -1) url += "?game=" + game_id;
  document.getElementById("gameURL").value = url;
}

