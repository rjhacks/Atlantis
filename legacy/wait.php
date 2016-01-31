<?php

	/* This function is called at the end of the script if a pipe has been created,
	 * both in case of normal connection termination, and in case of connection abort.
	 */
	function remove_pipe($pipe) {
		unlink($pipe);
	}


	header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
	header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Date in the past

	if (!isset($_GET['id']) || !isset($_GET['player']) || !isset($_GET['mode'])) {
		echo "ID, player or mode not set";
		exit(1);
	}
	
	$id = -1;
	$player = -1;
	$mode = "";
	$id = intval($_GET['id']);
	$player = intval($_GET['player']);
	$mode = $_GET['mode'] == "notify" ? "notify" : "wait";
	
	if ($id == 0) {
		echo "Invalid ID";
		exit(1);
	}
	$ret = 0;
	$skip = false;

	// if there's a specific turn-number to wait for, check if it isn't already there
	// if it is, skip waiting
	if ($mode == "wait" && isset($_GET['move'])) {
		$move = intval($_GET['move']);
		if (file_exists("games/$id.$move.xml")) { // does the turn already exist?
			$ret = $move; // turn exists, skip waiting
			$skip = true;
		}
	}
	
	if ($mode == "wait" && $skip == false) { // wait for unlock
		// find the next unused filename for the pipe
		$i = 0;
		$pipe = "";
		while ($pipe == "" || file_exists($pipe)) {
			$pipe = "pipes/$id.$player." . $i. ".pipe";
			$i++;
		}
		
		// make sure the pipe will be removed when not used anymore
		register_shutdown_function(remove_pipe, getcwd() . "/" . $pipe);
		
		// create the pipe
		posix_mkfifo($pipe, 0777);
		
		// block while waiting for input
		$ret = file_get_contents($pipe);
	} else if ($skip == false) { // notifying - do unlocks for all other players
		foreach (glob("pipes/$id.*.*.pipe") as $filename) {
			if (!preg_match("/^pipes\/$id\.$player\.[0-9]+.pipe$/", $filename)) {
				file_put_contents($filename, "go");
			}
		}
	}
	
	echo $ret;

?>