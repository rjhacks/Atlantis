// The methods in this file won't have a place in the final game, but
// allow us to see some of the other mechanics in action for now.

function SetUp() {
  tower = new Tower(0 /* player */, 1 /* height */, false /* is_growing_point */);
  segment = new Segment(0, 0);
  for (point of segment.points) {
    point.tower = clone(tower);
  }

  segment = new Segment(1,-2);
  segment = new Segment(3,1);

  tower.player = 1;
  segment = new Segment(4,-1);
  for (point of segment.points) {
    point.tower = clone(tower);
  }
  game.players = [ {"name": "RJ"}, {"name": "Benjamin"} ];
  game.rules_version = "classic";
}

function fillURLBox() {
  var url = document.URL;
  if (url.indexOf("?") == -1) url += "?game=" + game_id;
  document.getElementById("gameURL").value = url;
}

