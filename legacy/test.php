<?php
	$id = -1;

	foreach (glob("games/*.xml") as $filename) {
	    $nr = explode(".", $filename);
	    $nr = explode("/", $nr[0]);
	    $nr = $nr[1];
	    echo "Found: $nr<br>";
	    if ($nr >= $id) {
	    	$id = $nr + 1;
	    }
	}
	
	echo "id: $id";
?>