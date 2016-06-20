package atlantis

import (
	"testing"
)

func TestFireBaseCreateGame(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping test: Firebase test uses external resources.")
	}
	players := []Player{Player{Name: "Red"}, Player{Name: "Blue"}}
	rulesVersion := "classic"
	db := MakeFirebaseDB()

	b := NewBoard()
	b.FromJSON(serializedBoard)
	g := db.CreateGame(players, rulesVersion, b)

	b.FromJSON(serializedBoard2)
	g.NextTurn(b)
}
