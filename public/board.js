// This file contains the data structures used to represent an Atlantis board.

// A map of all the points in the game. Maps PosStr(Position) -> Point
var allPoints = new Map();
function getPoint(x, y) {
  var p = new Position(x, y);
  if (!allPoints.has(PosStr(p))) return null;
  return allPoints.get(PosStr(p));
}
function setPoint(point) {
  allPoints.set(PosStr(point.pos), point);
}
function equalsPoint(point1, point2) {
  return point1.pos.x == point2.pos.x && point1.pos.y == point2.pos.y;
}

function clearHighlights() {
  for (point of allPoints.values()) {
    point.highlight = false;
  }
}

function zeroForNull(val) {
  if (val === undefined || val === null) {
    return 0;
  }
  return val;
}

// The list of all the Segments in the game.
var allSegments = new Map();
function getSegment(x, y) {
  var p = new Position(x, y);
  if (!allSegments.has(PosStr(p))) return null;
  return allSegments.get(PosStr(p));
}
function setSegment(segment) {
  allSegments.set(PosStr(new Position(segment.center_x, segment.center_y)), segment);
}

// For every possible neighbours of point (x,y), calls func(neighbour_x, neighbour_y, context).
function forEachNeighbour(x, y, context, func) {
  func(x - 1, y - 1, context);
  func(x - 1, y, context);
  func(x, y - 1, context);
  func(x, y + 1, context);
  func(x + 1, y, context);
  func(x + 1, y + 1, context);
}

function Segment(center_x, center_y) {
	this.center_x = center_x;
  this.center_y = center_y;
  this.moved = false;  // A rules-hint.
  this.points = [];
  this.last_death_player = -1;
  var addPoint = function(x, y, segment) {
    var point = new Point(segment, x, y);
    segment.points.push(point);
  }
  addPoint(center_x, center_y, this);
  forEachNeighbour(center_x, center_y, this /* context = segment */, addPoint);
  setSegment(this);
}

function ComputeLivingNeighbours() {
  for (var point of allPoints.values()) {
    point.num_living_neighbours = 0;
    forEachNeighbour(point.pos.x, point.pos.y, point, function(x, y, point) {
      var neighbour = getPoint(x, y);
      if (neighbour == null || neighbour.is_dead) return;
      if (neighbour.tower != null && neighbour.tower.is_growing_point) return;
      point.num_living_neighbours++;
    });
  }
}

function Position(x, y) {
  this.x = x;
  this.y = y;
}

function PosStr(pos) { return pos.x + "," + pos.y; }

function Tower(player, height, is_growing_point) {
  this.player = player;
  this.height = height;
  this.is_growing_point = is_growing_point;
}

function Point(segment, x, y) {
	this.segment = segment;
  this.pos = new Position(x, y);
  this.tower = null;
  this.num_living_neighbours = 0;
  this.is_dead = false;
  this.highlight = false;  // Purely a hint to UI. Not persisted.
  this.blocks_annihilated_this_turn = 0;  // Hint for the first turn placement code. Not persisted.

  // Register this point with the global points map.
  setPoint(this);
}

function RemoveBlocksFromTower(point, player, num_blocks, tentative) {
  if (point.tower == null) {
    if (num_blocks > 0) console.log("BUG: removing blocks from null tower");
    return;
  }
  if (point.tower.height < num_blocks) {
    console.log("BUG: removing more blocks than tower has");
    return;
  }
  point.tower.height -= num_blocks;
  if (tentative) {
    // Keep 0-height towers to show where steps happened, but make sure they're assigned to the
    // player who's moving, for visual effect.
    if (point.tower.height == 0) {
      point.tower.player = player;
    }
  } else {
    point.blocks_annihilated_this_turn += num_blocks;
    // Clear 0-height towers.
    if (point.tower.height == 0) point.tower = null;
  }
}

function AddBlocksToTower(point, player_id, num_blocks, tentative) {
  if (point.tower == null || point.tower.height == 0) {
    point.tower = { height: 0, is_growing_point: false };
    point.tower.player = player_id;
  }
  if (point.tower.player == player_id) {
    point.tower.height += num_blocks;
  } else {
    // Rare: two players started side-by-side, and one player toppled onto the
    // current player's home segment, allowing the current player to already
    // annihilate blocks on the placement turn.
    RemoveBlocksFromTower(point, player_id, num_blocks, tentative);
  }
}

function MoveBlocks(fromPoint, toPoint, num_blocks, tentative) {
  if (toPoint.tower != null && toPoint.tower.player != fromPoint.tower.player) {
    // First cancel out existing blocks.
    var num_to_remove = Math.min(toPoint.tower.height, num_blocks);
    RemoveBlocksFromTower(toPoint, fromPoint.tower.player, num_to_remove, tentative);
    num_blocks -= num_to_remove;
  }
  if (num_blocks > 0) AddBlocksToTower(toPoint, fromPoint.tower.player, num_blocks, tentative);
  return num_blocks;
}

function WillTopple(point) {
  if (point.tower == null) return false;

  // Count the number of neighbours.
  var counter = { neighbours: 0 };
  forEachNeighbour(point.pos.x, point.pos.y, counter, function(x, y, c) {
    neighbour = getPoint(x, y);
    if (neighbour == null || neighbour.is_dead) return;
    if (neighbour.tower != null && neighbour.tower.is_growing_point) return;
    counter.neighbours++;
  });

  return point.tower.height >= counter.neighbours;
}

// Topples a tower on this point; make sure that's appropriate.
function DoTopple(point) {
  forEachNeighbour(point.pos.x, point.pos.y, point, function(x, y, fromPoint) {
    neighbour = getPoint(x, y);
    if (neighbour == null || neighbour.is_dead) return;
    if (neighbour.tower != null && neighbour.tower.is_growing_point) return;
    MoveBlocks(fromPoint, neighbour, 1, false);
  });
  if (point.tower.is_growing_point) {
    point.is_dead = true;
    if (point.segment != null) {  // Can be null only in tests.
      var num_dead_points_on_segment = 0;
      var countDead = function(x, y, ignored) {
        var p = getPoint(x, y);
        if (p == null) return;
        if (p.is_dead) {
          num_dead_points_on_segment++;
        }
      }
      countDead(point.segment.center_x, point.segment.center_y, null);
      forEachNeighbour(point.segment.center_x, point.segment.center_y, null, countDead);
      if (num_dead_points_on_segment == 7) {
        point.segment.last_death_player = point.tower.player;
      }
    }
    point.tower = null;
  } else {
    point.tower.is_growing_point = true;
    point.tower.height = 0;
  }
}

// Topples all points that are toppleable, but doesn't do chain reactions. Returns
// true iff at least one topple took place. To do chain reactions, keep calling
// this method until it return false.
function DoOneToppleRound(player) {
  var to_topple = [];
  for (var point of allPoints.values()) {
    if (point.tower == null || point.tower.player != player) continue;
    if (WillTopple(point)) to_topple.push(point);
  }
  for (var point of to_topple) {
    DoTopple(point);
  }
  return to_topple.length > 0;
}

function PlayerWillTopple(player) {
  for (var point of allPoints.values()) {
    if (point.tower == null || point.tower.player != player) continue;
    if (WillTopple(point)) return true;
  }
  return false;
}

// Grows a growing point on this point, if appropriate.
function MaybeGrow(point) {
  if (point.tower != null && point.tower.is_growing_point) point.tower.height++;
}

function GrowAll(player) {
  for (var point of allPoints.values()) {
    if (point.tower == null || point.tower.player != player) continue;
    MaybeGrow(point);
  }
}

function HasGrowingPoints(player_id) {
  for (var point of allPoints.values()) {
    if (point.tower != null && point.tower.player == player_id
        && point.tower.is_growing_point) {
      return true;
    }
  }
  return false;
}

// Modifies the game state with the given move, if legal. If "tentative" is true,
// any changes to the board will be highlighted. If it is false, the move is recorded
// as having happened, and future moves for this segment/tower will be prevented.
// Returns true if a legal move was displayed, or false if the move wasn't legal.
function ApplyMove(fromPos, toPos, tentative) {
  var fromPoint = getPoint(fromPos.x, fromPos.y);
  var toPoint = getPoint(toPos.x, toPos.y);

  // The source segment can't have moved yet.
  if (fromPoint.segment != null && fromPoint.segment.moved) return false;

  // The source point cannot be a growing point.
  if (fromPoint.tower != null && fromPoint.tower.is_growing_point) return false;

  // The target point must exist, must not be dead, and must not be a growing point.
  if (toPoint == null || toPoint.is_dead) return false;
  if (toPoint.tower != null && toPoint.tower.is_growing_point) return false;

  // Legal moves either change only x or y coordinates, or change x and y in the same way.
  var posDelta = new Position(toPos.x - fromPos.x, toPos.y - fromPos.y);
  var xStep = posDelta.x != 0 ? (posDelta.x > 0 ? 1 : -1) : 0;
  var yStep = posDelta.y != 0 ? (posDelta.y > 0 ? 1 : -1) : 0;
  if (posDelta.x == 0 && posDelta.y == 0) return false;
  if (posDelta.x != 0 && posDelta.y != 0 && posDelta.x != posDelta.y) return false;

  // There must be enough blocks on the origin point to complete the desired move.
  var steps = posDelta.x != 0 ? Math.abs(posDelta.x) : Math.abs(posDelta.y);
  if (fromPoint.tower == null) return false;
  if (fromPoint.tower.height - zeroForNull(fromPoint.tower.num_moved_blocks) < steps) return false;

  // Step along the path, ensuring this is a legal move.
  var currPos = clone(fromPos);
  var player = fromPoint.tower.player;
  for (i = 1; i <= steps; i++) {
    currPos.x += xStep;
    currPos.y += yStep;
    var currPoint = getPoint(currPos.x, currPos.y);
    if (currPoint.is_dead) return false;
    if (currPoint.tower != null && currPoint.tower.is_growing_point) return false;
  }

  // We're now certain this is a legal move. Step along the path taken, making any appropriate changes.
  var numBlocks = steps;
  var lastPoint = fromPoint;
  currPos = clone(fromPos);
  var player = fromPoint.tower.player;
  for (i = 1; i <= steps; i++) {
    currPos.x += xStep;
    currPos.y += yStep;
    var currPoint = getPoint(currPos.x, currPos.y);
    var survivingBlocks = 0;
    if (numBlocks > 0) {
      survivingBlocks = MoveBlocks(lastPoint, currPoint, numBlocks, tentative);
      RemoveBlocksFromTower(lastPoint, player, numBlocks, tentative);
      numBlocks = survivingBlocks;
    }
    if (numBlocks == 0 && tentative && currPoint.tower == null) {
      // Leave 0-height towers in place where steps happened, even when there
      // was total annihilation at some point.
      currPoint.tower = new Tower(player, 0, false);
    }
    lastPoint.highlight = tentative;
    lastPoint = currPoint;
  }
  lastPoint.highlight = tentative;
  if (!tentative) {
    // Prevent the moved blocks from being moved again this turn.
    if (lastPoint.tower != null) {
      if (lastPoint.tower.num_moved_blocks === undefined) lastPoint.tower.num_moved_blocks = 0;
      lastPoint.tower.num_moved_blocks += numBlocks;
    }
    // Prevent the moved segment from being moved again this turn.
    if (fromPoint.segment != null) fromPoint.segment.moved = true;
  }
  return true;
}

function CountPlacedBlocksForPlayer(seg_center_x, seg_center_y, player_id) {
  seg = getSegment(seg_center_x, seg_center_y);
  if (seg == null) return 0;
  var result = 0;
  for (var point of seg.points) {
    if (point.tower != null && point.tower.player == player_id) {
      result += point.tower.height;
    }
    result += point.blocks_annihilated_this_turn;
  }
  return result;
}
