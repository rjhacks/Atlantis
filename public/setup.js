var b_ready;
var d_namesBox;

var num_segments_selected = 0;
var num_players_selected = 0;
var players_selected = [];

function segmentAbove(seg) {
  return new Segment(seg.center_x + 2, seg.center_y + 3);
}

function segmentBelow(seg) {
  return new Segment(seg.center_x - 2, seg.center_y - 3);
}

function segmentRightUp(seg) {
  return new Segment(seg.center_x + 3, seg.center_y + 1);
}

function segmentRightDown(seg) {
  return new Segment(seg.center_x + 1, seg.center_y - 2);
}

function setup_Begin() {
  var max_columns = 6;
  var max_rows = 5;
  var direction = segmentAbove;
  var segment = null;
  for (var i = 0; i < max_columns; i++) {
    for (var j = 0; j < max_rows; j++) {
      segment = segment != null ? direction(segment) :  new Segment(0, 0);
      if (direction == segmentRightDown) direction = segmentAbove;
      if (direction == segmentRightUp) direction = segmentBelow;
    }
    if (direction == segmentBelow) direction = segmentRightDown;
    if (direction == segmentAbove) direction = segmentRightUp;
  }
  atlantis.onclick = setup_segmentSelectionMouseClicked;
  redrawBoard();
  t_status.innerHTML = "Please click the segments you want in your board.";
}

function setup_segmentSelectionMouseClicked(e) {
  var posx = getMouseX(e);
  var posy = getMouseY(e);
  var seg = GetSegmentAt(new Position(posx, posy));
  seg.highlight = seg.highlight ? false : true;
  num_segments_selected += seg.highlight ? 1 : -1;
  if (num_segments_selected >= 4) {
    enableBigButton(b_ready, "good");
  } else {
    disableBigButton(b_ready);
  }
  redrawBoard();
}

function setup_SegmentsSelected() {
  disableBigButton(b_ready);

  // Remove the segments we haven't picked.
  var tmpSegments = allSegments;
  clearState();  // Wipes allSegments and its friends.
  for (var seg of tmpSegments.values()) {
    if (seg.highlight) new Segment(seg.center_x, seg.center_y);
  }
  atlantis.onclick = setup_playerPositionMouseClicked;
  t_status.innerHTML = "Please select the player's starting segments.";
  b_ready.value = "Use these positions";
  b_ready.onclick = setup_PlayerPositionsChosen;
  offsetX = 0;
  offsetY = 0;
  console.log("Setting up game with " + game.rules_version + " rules");
  redrawBoard();
}

function setup_playerPositionMouseClicked(e) {
  var posx = getMouseX(e);
  var posy = getMouseY(e);
  var seg = GetSegmentAt(new Position(posx, posy));
  if (seg.highlight) {
    players_selected[seg.highlightPlayer] = false;
    seg.highlight = false;
    delete seg.highlightPlayer;
    num_players_selected--;
  } else if (num_players_selected < 6) {
    // Check for deselected players.
    for (var i = 0; i < players_selected.length; i++) {
      if (!players_selected[i]) {
        seg.highlight = true;
        seg.highlightPlayer = i;
        players_selected[i] = true;
        num_players_selected++;
        break;
      }
    }
    if (!seg.highlight && players_selected.length < 6) {
      // No previously deselected players. Introduce a new one.
      seg.highlight = true;
      seg.highlightPlayer = players_selected.length;
      players_selected.push(true);
      num_players_selected++;
    }
  }
  if (num_players_selected >= 2) {
    enableBigButton(b_ready, "good");
  } else {
    disableBigButton(b_ready);
  }
  redrawBoard();
}

function setup_PlayerPositionsChosen() {
  disableBigButton(b_ready);
  atlantis.style.display = "none";

  var inputs = "<center><table>";
  for (var i = 0; i < num_players_selected; i++) {
    inputs += "<tr><td>Player playing <font color=\"" + colors[i] + "\">" + colorNames[i] + "</font>:</td><td>"
              + "<input type=\"text\" class=\"namesInput\" id=\"namesInput_" + i + "\" size=15 "
              + "onkeyup=\"setup_NameChanged()\"></td></tr>";
  }
  inputs += "</table></center>";
  d_namesBox.innerHTML = inputs;
  d_namesBox.style.display = "block";
  b_ready.value = "That's them!";
  t_status.innerHTML = "What are your friends called?";
  b_ready.onclick = setup_NamesChosen;
}

function setup_NameChanged() {
  // Check whether all the names are set.
  for (var i = 0; i < num_players_selected; i++) {
    var name_box = document.getElementById("namesInput_" + i);
    if (name_box.value == "") {
      disableBigButton(b_ready);
      return;
    }
    if (i < game.players.length) {
      game.players[i].name = name_box.value;
    } else {
      game.players.push({name: name_box.value});
    }
  }

  // All the names are set! Pre-populate the board as far as appropriate.
  for (var seg of allSegments.values()) {
    if (seg.highlight) {
      game.players[seg.highlightPlayer].home_segment =
          {center_x: seg.center_x, center_y: seg.center_y};
    }
  }
  if (game.rules_version == "classic") {
    // Fill the segments with the appropriate towers.
    for (var point of allPoints.values()) {
      if (point.segment.highlight) {
        point.tower = {player: point.segment.highlightPlayer, height: 1, is_growing_point: false};
      }
    }
  }

  enableBigButton(b_ready, "good");
}

function setup_NamesChosen() {
  disableBigButton(b_ready);
  d_namesBox.style.display = "none";

  createGame(setup_GameCreated);
}

function setup_GameCreated() {
  var linkstr = "Game created! Yay! Send these links to your friends:<br/><center><table>";
  var base_url = location.href.split('?')[0] + "?game=" + game_id;
  for (var i = 0; i < num_players_selected; i++) {
    var url = base_url + "&player=" + i;
    linkstr += "<tr><td style=\"text-align:right; padding:5px\"><a href=\"" + url + "\" target=\"_blank\">"
               + game.players[i].name + "</a>:</td>"
               + "<td><input type=\"text\" disabled=\"true\" size=" + url.length + " value=\"" + url + "\">"
               + "</td></tr>";
  }
  linkstr += "<tr><td colspan=2 style=\"padding:20px; text-align:center\">"
             + "Or <a href=\"" + base_url + "\">click here to play on the same screen</a>."
             + "</td></tr>";

  var url = base_url + "&player=-1";
  linkstr += "<tr><td style=\"text-align: right; padding:5px;\">"
             + "<a href=\"" + url + "\" target=\"_blank\">Spectator link</a>:</td>"
             + "<td><input type=\"text\" disabled=\"true\" size=" + url.length + " value=\"" + url + "\">"
             + "</td></tr></table></center>";
  t_status.innerHTML = linkstr;
}


