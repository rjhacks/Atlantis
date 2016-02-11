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

// The list of all the Segments in the game.
var segments = [];

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
  this.points = [];
  var addPoint = function(x, y, segment) {
    var point = new Point(segment, x, y);
    segment.points.push(point);
    setPoint(point);
  }
  addPoint(center_x, center_y, this);
  forEachNeighbour(center_x, center_y, this /* context = segment */, addPoint);
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
  this.is_dead = false;
}

function RemoveBlocksFromTower(point, num_blocks) {
  if (point.tower == null) {
    if (num_blocks > 0) console.log("BUG: removing blocks from null tower");
    return;
  }
  if (point.tower.height < num_blocks) {
    console.log("BUG: removing more blocks than tower has");
    return;
  }
  point.tower.height -= num_blocks;
  if (point.tower.height == 0) point.tower = null;
}

function AddBlocksToTower(point, player_id, num_blocks) {
  if (point.tower == null) {
    point.tower = { height: 0, is_growing_point: false };
    point.tower.player = player_id;
  }
  point.tower.height += num_blocks;
}

function MoveBlocks(fromPoint, toPoint, num_blocks) {
  if (toPoint.tower != null && toPoint.tower.player != fromPoint.tower.player) {
    // First cancel out existing blocks.
    var num_to_remove = Math.min(toPoint.tower.height, num_blocks);
    RemoveBlocksFromTower(toPoint, num_to_remove);
    num_blocks -= num_to_remove;
  }
  if (num_blocks > 0) AddBlocksToTower(toPoint, fromPoint.tower.player, num_blocks); 
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
    MoveBlocks(fromPoint, neighbour, 1);
  });
  if (point.tower.is_growing_point) {
    point.is_dead = true;
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

