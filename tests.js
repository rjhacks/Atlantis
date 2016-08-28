function clear() {
  clearState();
  board = {};
}

function clearTurn() {
  for (var point of allPoints.values()) {
    if (point.segment != null) point.segment.moved = false;
    if (point.tower != null) point.tower.num_moved_blocks = 0;
  }
}

function testMove(from_pos, to_pos) {
  return ApplyMove(from_pos, to_pos, false /* tentative */);
}

function assertSuperset(assert, actual, expected) {
  if (expected == null || actual == null) assert.deepEqual(actual, expected);
  // Remove any properties in 'actual' that don't appear in 'expected'.
  for (property in actual) {
    if (expected.hasOwnProperty(property)) continue;
    delete actual[property];
  }
  assert.deepEqual(actual, expected);
}

// For reasons that are beyond me, QUnit insists on comparing the constructors with
// which two objects were created to determine equality. All I want to know is if
// they match in terms of fields.
function assertEqualContents(assert, actual, expected) {
  obj1 = JSON.parse(JSON.stringify(actual));
  obj2 = JSON.parse(JSON.stringify(expected));
  assert.deepEqual(obj1, obj2);
}

QUnit.test("Segment construction", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  assert.equal(seg1.center_x, 0);
  assert.equal(seg1.center_y, 0);
  assert.equal(seg1.points.length, 7);

  forEachNeighbour(seg1.center_x, seg1.center_y, null, function(x, y) {
    var point = getPoint(x, y);
    assert.deepEqual(point.pos.x, x);
    assert.deepEqual(point.pos.y, y);
    assert.deepEqual(point.tower, null);
    assert.deepEqual(point.is_dead, false);
    assert.equal(point.segment, seg1);
  });
  var point00 = getPoint(0, 0);
  var point01 = getPoint(0, 1);
  var pointm1m1 = getPoint(-1, -1);
  ComputeLivingNeighbours();
  assert.equal(6, point00.num_living_neighbours);
  assert.equal(3, point01.num_living_neighbours);
  assert.equal(3, pointm1m1.num_living_neighbours);
});


QUnit.test("ApplyMove: move a block 1 step to an empty point", function(assert) {
  clear();
  var tower = {player: 0, height: 1, is_growing_point: false};
  var point00 = new Point(null, 0, 0);
  point00.tower = clone(tower);
  var point01 = new Point(null, 0, 1);
  var point10 = new Point(null, 1, 0);
  var point11 = new Point(null, 1, 1);

  assert.ok(testMove(point00.pos, point01.pos));
  assertSuperset(assert, point00.tower, null);
  assertSuperset(assert, point01.tower, tower);

  // An illegal move changes nothing.
  assert.notOk(testMove(point00.pos, point01.pos));  // No blocks left.
  assertSuperset(assert, point00.tower, null);
  assertSuperset(assert, point01.tower, tower);
  assert.notOk(testMove(point01.pos, point10.pos));  // Not a straight-line move.
  assertSuperset(assert, point00.tower, null);
  assertSuperset(assert, point01.tower, tower);

  // We can move the block to a different point again.
  assert.ok(testMove(point01.pos, point11.pos));
  assertSuperset(assert, point01.tower, null);
  assertSuperset(assert, point11.tower, tower);
});

QUnit.test("ApplyMove: move a block 1 step to a point that already has the same player's blocks", function(assert) {
  clear();
  var point00 = new Point(null, 0, 0);
  point00.tower = {player: 0, height: 1, is_growing_point: false};
  var point01 = new Point(null, 0, 1);
  point01.tower = {player: 0, height: 1, is_growing_point: false};
  var point11 = new Point(null, 1, 1);
  point11.tower = {player: 0, height: 2, is_growing_point: false};

  assert.ok(testMove(point00.pos, point01.pos));
  assertSuperset(assert, point00.tower, null);
  assertSuperset(assert, point01.tower, {player: 0, height: 2, is_growing_point: false});

  assert.ok(testMove(point01.pos, point11.pos));
  assertSuperset(assert, point01.tower, {player: 0, height: 1, is_growing_point: false});
  assertSuperset(assert, point11.tower, {player: 0, height: 3, is_growing_point: false});
});

QUnit.test("ApplyMove: a tower of size N moves in steps of N", function(assert) {
  clear();
  var point00 = new Point(null, 0, 0);
  point00.tower = {player: 0, height: 3, is_growing_point: false};
  var point01 = new Point(null, 0, 1);
  var point02 = new Point(null, 0, 2);
  var point03 = new Point(null, 0, 3);
  var point04 = new Point(null, 0, 4);
  var point05 = new Point(null, 0, 5);

  assert.ok(testMove(point00.pos, point01.pos));
  assertSuperset(assert, point00.tower, {player: 0, height: 2, is_growing_point: false});
  assertSuperset(assert, point01.tower, {player: 0, height: 1, is_growing_point: false});

  assert.ok(testMove(point00.pos, point02.pos));
  assertSuperset(assert, point00.tower, null);
  assertSuperset(assert, point01.tower, {player: 0, height: 1, is_growing_point: false});
  assertSuperset(assert, point02.tower, {player: 0, height: 2, is_growing_point: false});

  assert.ok(testMove(point01.pos, point02.pos));
  assertSuperset(assert, point00.tower, null);
  assertSuperset(assert, point01.tower, null);
  assertSuperset(assert, point02.tower, {player: 0, height: 3, is_growing_point: false});

  assert.ok(testMove(point02.pos, point05.pos));
  assertSuperset(assert, point02.tower, null);
  assertSuperset(assert, point05.tower, {player: 0, height: 3, is_growing_point: false});
});

QUnit.test("ApplyMove: opposing blocks annihilate", function(assert) {
  clear();
  var point00 = new Point(null, 0, 0);
  point00.tower = {player: 0, height: 5, is_growing_point: false};
  var point01 = new Point(null, 0, 1);
  point01.tower = {player: 1, height: 4, is_growing_point: false};
  var point02 = new Point(null, 0, 2);
  var point03 = new Point(null, 0, 3);
  point03.tower = {player: 1, height: 1, is_growing_point: false};

  // Onto a larger opposing tower.
  assert.ok(testMove(point00.pos, point01.pos));
  assertSuperset(assert, point00.tower, {player: 0, height: 4, is_growing_point: false});
  assertSuperset(assert, point01.tower, {player: 1, height: 3, is_growing_point: false});

  // Over a larger opposing tower.
  assert.ok(testMove(point00.pos, point02.pos));
  assertSuperset(assert, point00.tower, {player: 0, height: 2, is_growing_point: false});
  assertSuperset(assert, point01.tower, {player: 1, height: 1, is_growing_point: false});
  assertSuperset(assert, point02.tower, null);

  // Over a smaller opposing tower.
  assert.ok(testMove(point00.pos, point02.pos));
  assertSuperset(assert, point00.tower, null);
  assertSuperset(assert, point01.tower, null);
  assertSuperset(assert, point02.tower, {player: 0, height: 1, is_growing_point: false});

  // Onto an equally large opposing tower.
  assert.ok(testMove(point02.pos, point03.pos));
  assertSuperset(assert, point02.tower, null);
  assertSuperset(assert, point03.tower, null);
});

QUnit.test("WillTopple", function(assert) {
  clear();
  var point00 = new Point(null, 0, 0);
  var point01 = new Point(null, 0, 1);  // 2 neighbours.
  var point02 = new Point(null, 0, 2);  // 3 neighbours.
  var point03 = new Point(null, 0, 3);
  var point_12 = new Point(null, -1, 2);  // Neighbour of (0,2), but not of (0,1).

  point01.tower = {player: 0, height: 0, is_growing_point: false};
  point02.tower = {player: 0, height: 0, is_growing_point: false};
  assert.notOk(WillTopple(point01));
  assert.notOk(WillTopple(point02));
  point01.tower.height++;
  point02.tower.height++;
  assert.notOk(WillTopple(point01));
  assert.notOk(WillTopple(point02));
  point01.tower.height++;
  point02.tower.height++;
  assert.ok(WillTopple(point01));
  assert.notOk(WillTopple(point02));
  point02.tower.height++;
  assert.ok(WillTopple(point02));
});

QUnit.test("DoTopple once", function(assert) {
  clear();
  var point00 = new Point(null, 0, 0);
  var point01 = new Point(null, 0, 1);  // 2 neighbours.
  var point02 = new Point(null, 0, 2);

  point01.tower = {player: 0, height: 2, is_growing_point: false};
  assert.ok(WillTopple(point01));
  DoTopple(point01);
  assertSuperset(assert, point00.tower, {player: 0, height: 1, is_growing_point: false});
  assertSuperset(assert, point01.tower, {player: 0, height: 0, is_growing_point: true});
  assertSuperset(assert, point02.tower, {player: 0, height: 1, is_growing_point: false});

  point01.tower.height = 2;
  assert.ok(WillTopple(point01));
  DoTopple(point01);
  assertSuperset(assert, point00.tower, {player: 0, height: 2, is_growing_point: false});
  assertSuperset(assert, point01.tower, null);
  assert.deepEqual(point01.is_dead, true);
  assertSuperset(assert, point02.tower, {player: 0, height: 2, is_growing_point: false});
});

QUnit.test("Living neighbour counts after toppling", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var seg2 = new Segment(3, 1);
  var point01 = getPoint(0, 1);
  var point11 = getPoint(1, 1);
  var point21 = getPoint(2, 1);
  ComputeLivingNeighbours();
  assert.equal(point01.num_living_neighbours, 3);
  assert.equal(point11.num_living_neighbours, 4);
  assert.equal(point21.num_living_neighbours, 5);

  point01.tower = {player: 0, height: 3, is_growing_point: false};
  DoTopple(point01);
  ComputeLivingNeighbours();
  assert.equal(point01.num_living_neighbours, 3);
  assert.equal(point11.num_living_neighbours, 3);
  assert.equal(point21.num_living_neighbours, 5);

  point01.tower.height = 3;
  DoTopple(point01);
  ComputeLivingNeighbours();
  assert.equal(point01.num_living_neighbours, 3);
  assert.equal(point11.num_living_neighbours, 3);
  assert.equal(point21.num_living_neighbours, 5);

  point11.tower.height = 3;
  DoTopple(point11);
  ComputeLivingNeighbours();
  assert.equal(point21.num_living_neighbours, 4);
});

QUnit.test("Every segment moves at most one tower", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var seg1 = new Segment(3, 1);

  var point00 = getPoint(0, 0);
  point00.tower = {player: 0, height: 1, is_growing_point: false};
  var point01 = getPoint(0, 1);
  point01.tower = {player: 0, height: 1, is_growing_point: false};
  var point10 = getPoint(1, 0);

  assert.ok(testMove(point00.pos, point10.pos));
  assert.notOk(testMove(point01.pos, point00.pos));

  var point31 = getPoint(3, 1);
  point31.tower = {player: 0, height: 1, is_growing_point: false};
  var point21 = getPoint(2, 1);
  point21.tower = {player: 0, height: 1, is_growing_point: false};

  // Moving onto the moved segment is still fine.
  assert.ok(testMove(point21.pos, point10.pos));
  assert.notOk(testMove(point31.pos, point21.pos));  // But no second move here either.
});

QUnit.test("Every block moves at most once", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var seg1 = new Segment(3, 1);

  var point10 = getPoint(1, 0);
  point10.tower = {player: 0, height: 1, is_growing_point: false};
  var point20 = getPoint(2, 0);
  var point30 = getPoint(3, 0);

  assert.ok(testMove(point10.pos, point20.pos));
  assert.deepEqual(point20.tower, {player: 0, height: 1, is_growing_point: false, num_moved_blocks: 1});
  assert.notOk(testMove(point20.pos, point30.pos));
});

QUnit.test("A tower with blocks that have already moved can still move the unmoved blocks", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var seg1 = new Segment(3, 1);

  var point10 = getPoint(1, 0);
  point10.tower = {player: 0, height: 1, is_growing_point: false};
  var point20 = getPoint(2, 0);
  point20.tower = {player: 0, height: 1, is_growing_point: false};
  var point30 = getPoint(3, 0);

  assert.ok(testMove(point10.pos, point20.pos));
  assert.ok(testMove(point20.pos, point30.pos));
});

QUnit.test("Unpacking a board only changes persisted info in the game state, leaving volatile data", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var point00_1 = getPoint(0, 0);
  point00_1.tower = {player: 0, height: 1, is_growing_point: false};
  serializeBoard();

  // Data items that aren't serialized (e.g. anything that isn't 'player', 'height' or 'is_growing_point' remains untouched
  // by a board-unpacking.
  point00_1.tower.highlight = true;
  point00_1.tower.some_future_key = true;
  var expected_tower = clone(point00_1.tower);

  // Data items that are serialized are overwitten by board-unpacking.
  point00_1.tower.height = 2;
  point00_1.tower.player = 1;
  point00_1.tower.is_growing_point = true;

  unpackBoard();
  var point00_2 = getPoint(0, 0);
  assert.equal(point00_2.tower, point00_1.tower);  // The same Point object is still in place.
  assert.deepEqual(point00_1.tower, expected_tower);
});

QUnit.test("Unpacking a board clears points that are not present in the serialized data entirely", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  serializeBoard();

  var point00 = getPoint(0, 0);
  point00.tower = {player: 0, height: 1, is_growing_point: false};

  unpackBoard();
  assert.equal(getPoint(0, 0).tower, null);
});

QUnit.test("Losing all your blocks along the way still highlights your whole path", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var seg2 = new Segment(3, 1);
  var point00 = getPoint(0, 0);
  var point10 = getPoint(1, 0);
  var point20 = getPoint(2, 0);
  var point30 = getPoint(3, 0);
  point00.tower = {player: 0, height: 3, is_growing_point: false};
  point10.tower = {player: 1, height: 3, is_growing_point: false};
  point30.tower = {player: 1, height: 1, is_growing_point: false};
  assert.ok(ApplyMove(point00.pos, point30.pos, true));  // A tentative move.
  assertEqualContents(assert, point00.tower, {player: 0, height: 0, is_growing_point: false});
  assert.deepEqual(point00.highlight, true);
  assertEqualContents(assert, point10.tower, {player: 0, height: 0, is_growing_point: false});
  assert.deepEqual(point10.highlight, true);
  assertEqualContents(assert, point20.tower, {player: 0, height: 0, is_growing_point: false});
  assert.deepEqual(point20.highlight, true);
  assertEqualContents(assert, point30.tower, {player: 1, height: 1, is_growing_point: false});
  assert.deepEqual(point30.highlight, true);
});

QUnit.test("You can't move a growing point", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var point00 = getPoint(0, 0);
  var point01 = getPoint(0, 1);
  point00.tower = {player: 0, height: 1, is_growing_point: true};
  assert.notOk(testMove(point00.pos, point01.pos));
});

QUnit.test("You can't move on to a growing point", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var point00 = getPoint(0, 0);
  var point01 = getPoint(0, 1);
  point00.tower = {player: 0, height: 1, is_growing_point: false};
  point01.tower = {player: 0, height: 1, is_growing_point: true};
  assert.notOk(testMove(point00.pos, point01.pos));
});

QUnit.test("You can't move over a growing point", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var point00 = getPoint(0, 0);
  var point01 = getPoint(0, 1);
  var point0m1 = getPoint(0, -1);
  point00.tower = {player: 0, height: 1, is_growing_point: true};
  point01.tower = {player: 0, height: 2, is_growing_point: false};
  assert.notOk(testMove(point01.pos, point0m1.pos));
});

QUnit.test("You can't move on to a dead point", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var point00 = getPoint(0, 0);
  var point01 = getPoint(0, 1);
  point00.tower = {player: 0, height: 1, is_growing_point: false};
  point01.is_dead = true;
  assert.notOk(testMove(point00.pos, point01.pos));
});

QUnit.test("You can't move over a dead point", function(assert) {
  clear();
  var seg1 = new Segment(0, 0);
  var point00 = getPoint(0, 0);
  var point01 = getPoint(0, 1);
  var point0m1 = getPoint(0, -1);
  point00.is_dead = true;
  point01.tower = {player: 0, height: 2, is_growing_point: false};
  assert.notOk(testMove(point01.pos, point0m1.pos));
});

