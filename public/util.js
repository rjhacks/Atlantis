function getMouseX(e) {
  var posx = 0;
  if (!e) var e = window.event;
  if (e.pageX)  {
    posx = e.pageX;
  }
  else if (e.clientX)   {
    posx = e.clientX + document.body.scrollLeft
      + document.documentElement.scrollLeft;
  }

  posx = posx - atlantis.offsetLeft;
  return posx;
}

function getMouseY(e) {
  var posy = 0;
  if (!e) var e = window.event;
  if (e.pageY)  {
    posy = e.pageY;
  }
  else if (e.clientY)   {
    posy = e.clientY + document.body.scrollTop
      + document.documentElement.scrollTop;
  }

  posy = posy - atlantis.offsetTop;
  return posy;
}

function disableBigButton(btn) {
  btn.disabled = true;
  btn.className = "big-btn disabled";
}

function enableBigButton(btn, style) {
  btn.disabled = false;
  btn.className = "big-btn " + style;
}

function disableSmallButton(btn) {
  btn.disabled = true;
  btn.className = "small-btn disabled";
}

function enableSmallButton(btn, style) {
  btn.disabled = false;
  btn.className = "small-btn";
}

function PlayNotificationSound() {
  var sound = document.getElementById("sound1");
  sound.play();
}

var blinkid = 0;
var blinkon = false;
var blinkmsg = true;
function SetBlinkTitle(on) {
	if (on == blinkon) return;  // No change.
	blinkon = on;

	blinkmsg = on;
	doBlinkTitle();
	if (on) {
		blinkid = setInterval("doBlinkTitle()", 1000);  // Call back every second.
	} else {
		clearInterval(blinkid)
	}
}

function doBlinkTitle() {
	if (blinkmsg) {
		document.title = "Your turn!";
	} else {
		document.title = "Atlantis";
	}
	blinkmsg = !blinkmsg;
}
