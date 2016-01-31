<?php

	header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
	header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Date in the past

	if (!isset($_GET['id'])) {
		echo "ID not set";
		exit(1);
	}
	
	$id = intval($_GET['id']);
	$move = 0;
	if (isset($_GET['move'])) {
		$move = intval($_GET['move']);
	}
	if ($id == 0) {
		echo "Invalid ID";
		exit(1);
	}
	
	if ($move <= 0) {
		$offset = $move;
		foreach (glob("games/$id.*.xml") as $filename) {
		    $nr = explode(".", $filename);
		    $nr = $nr[1];
		    if ($nr > $move) {
		    	$move = $nr;
		    }
		}
		$move += $offset;
	}
	
	$contents = file_get_contents("games/$id.$move.xml");
	if ($contents === FALSE) {
		echo "Invalid ID or move nr";
	} else {
		echo $contents;
	}

?>