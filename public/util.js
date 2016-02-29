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

function disableButton(btn) {
  btn.disabled = true;
  btn.className = "big-btn disabled";
}

function enableButton(btn, style) {
  btn.disabled = false;
  btn.className = "big-btn " + style;
}


