<?php

	if (!isset($_POST['id']) || !isset($_POST['xml']) || !isset($_POST['player'])) {
		echo "ID, player or XML not set";
		exit(1);
	}
	
	$id = intval($_POST['id']);
	$player = intval($_POST['player']);
	$move = 1;
	if ($id == 0) {
		echo "Invalid ID";
		exit(1);
	}
		
	if ($id < 0) {
		$id = 1;
		foreach (glob("games/*.*.xml") as $filename) {
		    $nr = explode(".", $filename);
		    $nr = explode("/", $nr[0]);
		    $nr = $nr[1];
		    if ($nr >= $id) {
		    	$id = $nr + 1;
		    }
		}
	}
	
	foreach (glob("games/$id.*.xml") as $filename) {
	    $nr = explode(".", $filename);
	    $nr = $nr[1];
	    if ($nr >= $move) {
	    	$move = $nr + 1;
	    }
	}
	
	if (file_put_contents("games/$id.$move.xml", str_replace('\\"', '"', $_POST['xml'])) === FALSE) {
		echo "Failed to write.";
	} else {
		foreach (glob("pipes/$id.*.pipe") as $filename) {
			if ($filename != "pipes/$id.$player.pipe") {
				file_put_contents($filename, $move);
			}
		}
		echo $id;
	}
	
?>