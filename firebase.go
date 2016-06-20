package atlantis

import (
	"fmt"
	"github.com/cosn/firebase"
	"log"
	"strconv"
	"strings"
)

const kGameURLPrefix = "https://atlantis-game.firebaseapp.com/?game="

// Data structures that match our Firebase schema's representation of a game.
type Player struct {
	Name string `json:"name"`
}
type Turn struct {
	TurnNumber  int `json:"turn_number"`
	BoardNumber int `json:"board_number"`
}
type SerializedGame struct {
	Players      []Player `json:"players"`
	RulesVersion string   `json:"rules_version"`
	Turn         Turn     `json:"turn"`
}

// Users can mock out 'DB' and 'Game' for testing.
type DB interface {
	CreateGame(players []Player, rulesVersion string, firstBoard *Board) Game
}
type Game interface {
	AddBoard(b *Board)
	NextTurn(b *Board)
}

// Our internal implementation of 'DB' and 'Game', based on Firebase.
type firebaseDB struct {
	initialized bool
	firebase    firebase.Client
	games       firebase.Client
}
type firebaseGame struct {
	id     string
	game   firebase.Client
	boards firebase.Client
	data   SerializedGame
}

func MakeFirebaseDB() DB {
	fb := new(firebaseDB)
	fb.initialize()
	return fb
}

func (fb *firebaseDB) initialize() {
	if !fb.initialized {
		fb.firebase.Init("https://atlantis-game.firebaseio.com/", "", nil)
		// Hacky McHackface: using .Child() would immediately fetch the URL, which we're
		// not permitted to do (that'd list all the games, which isn't allowed). Fortunately,
		// we don't need the actual contents; all we need is the right URL. Fix that up.
		fb.games = fb.firebase
		fb.games.Url = fb.games.Url + "/games"
		fb.initialized = true
	}
}

func (g *firebaseGame) AddBoard(b *Board) {
	g.data.Turn.BoardNumber += 1

	// Determine the URL of the new board, then set it.
	fbboard := g.boards
	fbboard.Url = fbboard.Url + "/turn_history/" + strconv.Itoa(g.data.Turn.TurnNumber) + "/board_history/"
	sb := b.ToSerializedBoard()
	_, err := fbboard.Set(strconv.Itoa(g.data.Turn.BoardNumber), sb, nil)
	if err != nil {
		log.Fatal("While creating board "+strconv.Itoa(g.data.Turn.TurnNumber)+","+
			strconv.Itoa(g.data.Turn.BoardNumber)+" for game "+g.id+" in Firebase: ", err)
	}

	// Tell the game that the board has been placed.
	err = g.game.Update("turn", g.data.Turn, nil)
	if err != nil {
		log.Fatal("Failed to increment turn/board count for game "+g.id+" in Firebase: ", err)
	}
	fmt.Printf("Added board %v,%v for game %v\n", g.data.Turn.TurnNumber, g.data.Turn.BoardNumber,
		kGameURLPrefix+g.id)
}

func (g *firebaseGame) NextTurn(b *Board) {
	g.data.Turn.TurnNumber += 1
	g.data.Turn.BoardNumber = -1
	g.AddBoard(b)
}

func (fb *firebaseDB) CreateGame(players []Player, rulesVersion string, firstBoard *Board) Game {
	g := new(firebaseGame)
	g.data = SerializedGame{Players: players, RulesVersion: rulesVersion, Turn: Turn{-1, -1}}
	pushed_game, err := fb.games.Push(g.data, nil)
	if err != nil {
		log.Fatal("While creating game in Firebase: %v\n", err)
	}

	g.game = *pushed_game
	// TODO(rjhacks): consider own Firebase library that just gives the name from Push() directly.
	// Obtain the ID of the newly-added game, which is the suffix of the URL it got.
	i := strings.LastIndex(g.game.Url, "/")
	if i < 0 {
		log.Fatal("Failed to get ID from URL " + g.game.Url)
	}
	g.id = g.game.Url[i+1:]

	// We don't have permission to just go read all the boards for a currently-still-non-existent game,
	// so (as we did in game creation before) we just hack up the appropriate URL.
	g.boards = fb.firebase
	g.boards.Url = fb.firebase.Url + "/boards/" + g.id

	// Set the first board.
	g.NextTurn(firstBoard)

	fmt.Printf("Created game %v\n", kGameURLPrefix+g.id)
	return g
}
