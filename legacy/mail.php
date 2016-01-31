<?php
	include('config.php');

	if (!isset($_GET['id']) || !isset($_GET['player'])) {
		echo "Game ID or player not set";
		exit(1);
	}
	$id = intval($_GET['id']);
	$player = intval($_GET['player']);
	if ($id == 0) {
		echo "Invalid ID";
		exit(1);
	}
	$file = "pipes/$id.$player.mail";

	$to = -1;
	if (isset($_GET['modify'])) { /* Modify the mail-addr file */
		if (isset($_GET['addr'])) { /* Store the address */
			$to = $_GET['addr'];
			file_put_contents($file, $to);
		} else {
			if (file_exists("pipes/$id.$player.mail")) {
				unlink($file);
			}
		}
	} else { /* Only read the mail-addr file */
		if (file_exists($file)) {
			$to = file_get_contents($file);
			if (isset($_GET['retrieve'])) { /* Only retrieve the address */
				echo $to;
			} else { /* Send a mail */
				send_notification($to, $id, $player);
			}
		}
	}
	
	function send_notification($to, $id, $player) {
		global $BASEURL;
		$subject = "[Atlantis] It's your turn!";
		$body = "Hi there! This is just to let you know that it's your turn at Atlantis.\n\n" .
					"Click here to go straight to the game: $BASEURL?id=$id&player=$player :).\n\n" .
					"Yours truly,\nAtlantis";
		if (mail($to, $subject, $body)) {
	  		echo("<p>Message successfully sent!</p>");
		} else {
			echo("<p>Message delivery failed...</p>");
		}
	}
?>