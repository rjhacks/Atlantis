var gameId = -1;

function create(fromLoad) {
	if (hasSupport()) {
		if (!fromLoad) {
			var ctx = getContext();
			ctx.save();
			ctx.translate(offsetX, offsetY);
		}
		
		// set up some global variables
		atlantis = document.getElementById('atlantis');
		topbox = document.getElementById('topbox');
		main = document.getElementById('main');
		
		// start the game with the board setup phase
		setup_board_start();	
	}
}

function loadgame() {
	if (hasSupport()) {
		/* Find the number of the game to load */
		gameId = getURLVar("id");
		if (gameId == '') {
			gameId = -1;
			create(false);
			return;
		}
		
		var ctx = getContext();
		ctx.save();
		ctx.translate(offsetX, offsetY);

		// set up some global variables
		atlantis = document.getElementById('atlantis');
		topbox = document.getElementById('topbox');
		main = document.getElementById('main');
		
		// load the field and start the game
		load(gameId, 0, false);
	}
}

function redraw() {
	if (hasSupport()) {
		var ctx = getContext();
		ctx.clearRect(-offsetX, -offsetY, atlantis.offsetWidth, atlantis.offsetHeight);
		for (var i = 0; i < columns; i++) {
			for (var j = i % 2; j < rows; j += 2) {
				if (segments[i] && segments[i][j]) {
					segments[i][j].draw();
				}
			}
		}
	}
}