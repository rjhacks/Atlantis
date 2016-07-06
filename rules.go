package atlantis

import (
	"fmt"
	"log"
	"strconv"
	//"math"
)

type Move struct {
	From Position
	To   Position
}

type Turn struct {
	// Maps: segment center position -> move from that segment.
	Moves map[Position]Move
}

func MakeTurn() (t Turn) {
	t.Moves = make(map[Position]Move)
	return
}

// Returns true if the turn consisted only of legal moves, and returns the board as it stands at
// the end of the turn. Does not modify 'from'.
func DoMoves(from *Board, t Turn) (bool, *Board) {
	b := from.DeepCopy()
	for _, move := range t.Moves {
		if !applyMove(&b, move.From, move.To) {
			return false, nil
		}
	}
	return true, &b
}

// Modifies the given board, applying any toppling that would happen (all of them, including chain
// reactions). Returns true if any toppling or growing took place.
func DoAllTopplesAndGrow(b *Board, player int) bool {
	numTopples := 0
	for ; doTopple(b, player); numTopples++ { // Repeat, for chain reactions.
	}
	numGrows := 0
	for _, point := range b.Points {
		if point.HasTower() && point.Tower.IsGrowingPoint {
			point.Tower.Height += 1
			numGrows += 1
		}
	}
	return numTopples > 0 || numGrows > 0
}

func max(a int, b int) int {
	if a < b {
		return b
	}
	return a
}

func min(a int, b int) int {
	if a < b {
		return a
	}
	return b
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

func stepSize(n int) int {
	if n < 0 {
		return -1
	}
	if n > 0 {
		return 1
	}
	return 0
}

func isLegalMove(b *Board, from Position, to Position) (legal bool, path []*Point) {
	// Guilty until proven innocent
	legal = false

	fromPoint, fromPointExists := b.Points[from]
	toPoint, toPointExists := b.Points[to]
	if !fromPointExists || !toPointExists {
		log.Println("From or to point does not exist")
		return
	}

	// Determine what way the move is going.
	xdist := toPoint.Position.X - fromPoint.Position.X
	ydist := toPoint.Position.Y - fromPoint.Position.Y
	if xdist == 0 && ydist == 0 { // At least X or Y needs to move.
		log.Println("Neither X nor Y moves")
		return
	}
	if xdist != 0 && ydist != 0 && xdist != ydist { // If X and Y both move, then in the same way.
		log.Println("X and Y don't move the same way")
		return
	}
	dist := max(abs(xdist), abs(ydist))

	// There must be enough blocks on the source point to reach the end point.
	if !fromPoint.HasTower() || fromPoint.Tower.Height < dist {
		fmt.Println(fromPoint)
		log.Println("There are not enough blocks on the source point")
		return
	}
	// TODO(rjhacks): Ensure that the blocks on this point haven't moved yet this turn.

	// Determine the list of points that are affected by this move (the path).
	xstep := stepSize(xdist)
	ystep := stepSize(ydist)
	x := fromPoint.Position.X
	y := fromPoint.Position.Y
	path = make([]*Point, dist+1)
	for i := 0; i <= dist; i++ {
		p, pExists := b.Points[Position{X: x, Y: y}]
		if !pExists || p.IsDead || (p.HasTower() && p.Tower.IsGrowingPoint) {
			log.Println("A point on the way is non-existent/dead, or a growing point")
			return
		}
		path[i] = p
		x += xstep
		y += ystep
	}
	legal = true
	return
}

func applyMove(b *Board, from Position, to Position) bool {
	legal, path := isLegalMove(b, from, to)
	if !legal {
		log.Println("Move not legal")
		return false
	}
	var fromPoint, toPoint *Point
	fromPoint = path[0]
	toPoint = path[len(path)-1]
	log.Println("Moving blocks to point " + strconv.Itoa(toPoint.Position.X) + "," + strconv.Itoa(toPoint.Position.Y))

	// We now know the move is legal. Step down the path, annihilating blocks as required.
	numBlocks := len(path) - 1
	player := fromPoint.Tower.Player
	fromPoint.Tower.Height -= numBlocks
	if fromPoint.Tower.Height == 0 {
		fromPoint.Tower = Tower{Player: -1}
	}
	for i := 1; i < len(path); i++ {
		point := path[i]
		if !point.HasTower() || point.Tower.Player == player {
			// Blocks pass over this point unhindered.
			continue
		}
		// There are opposing blocks in this place.
		annihilated := min(numBlocks, point.Tower.Height)
		numBlocks -= annihilated
		point.Tower.Height -= annihilated
		if point.Tower.Height == 0 {
			point.Tower = Tower{Player: -1}
		}
	}
	if !toPoint.HasTower() && numBlocks > 0 {
		toPoint.Tower = Tower{Player: player}
	}
	toPoint.Tower.Height += numBlocks
	fmt.Printf("Incremented the height of the tower to %v\n", toPoint.Tower.Height)

	return true
}

func willTopple(b *Board, point *Point) bool {
	if !point.HasTower() {
		return false
	}
	pos := point.Position

	liveNeighbours := 0
	checkNeighbour := func(x int, y int) {
		n, hasNeighbour := b.Points[Position{x, y}]
		if !hasNeighbour || n.IsDead || (n.HasTower() && n.Tower.IsGrowingPoint) {
			return
		}
		liveNeighbours++
	}
	forEachNeighbour(pos.X, pos.Y, checkNeighbour)

	return point.Tower.Height >= liveNeighbours
}

/*
func willTopple(b *Board) bool {
	for _, point := range b.Points {
		if willTopple(point) {
			return true
		}
	}
	return false
}
*/

// Does one set of topples, no chain reactions. Returns true if any topples took place, false otherwise.
func doTopple(b *Board, player int) bool {
	// TODO(rjhacks): optimize, by looking only at points that could have toppled because of
	// a Turn, or because of chain reactions.
	toTopple := make([]*Point, 0, len(b.Points))
	for _, point := range b.Points {
		if willTopple(b, point) {
			toTopple = append(toTopple, point)
		}
	}
	for _, point := range toTopple {
		addToNeighbour := func(x, y int) {
			n, hasNeighbour := b.Points[Position{x, y}]
			if !hasNeighbour || n.IsDead || (n.HasTower() && n.Tower.IsGrowingPoint) {
				return
			}
			if !n.HasTower() {
				n.Tower = Tower{Player: player}
			}
			if n.Tower.Player == player {
				n.Tower.Height += 1
			} else {
				n.Tower.Height -= 1
				if n.Tower.Height == 0 {
					n.Tower = Tower{Player: -1}
				}
			}
		}
		forEachNeighbour(point.Position.X, point.Position.Y, addToNeighbour)
		if point.Tower.IsGrowingPoint {
			point.Tower = Tower{Player: -1}
			point.IsDead = true
		} else {
			point.Tower.Height = 0
			point.Tower.IsGrowingPoint = true
		}
	}
	return len(toTopple) > 0
}
