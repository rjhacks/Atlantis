package atlantis

import (
//"fmt"
)

type Move struct {
	From Position
	To   Position
}

// Attention: not safe to copy; the map doesn't deep-copy. Use DeepCopy().
type Turn struct {
	// Maps: segment center position -> move from that segment.
	Moves map[Position]Move
}

func (t1 Turn) DeepCopy() (t2 Turn) {
	t2 = MakeTurn()
	for pos, m := range t1.Moves {
		t2.Moves[pos] = m
	}
	return
}

func MakeTurn() (t Turn) {
	t.Moves = make(map[Position]Move)
	return
}

// Returns true if the turn consisted only of legal moves, and returns the board as it stands at
// the end of the turn. Does not do toppling or growing. Does not modify 'from'.
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

// Returns true iff the game on board 'b' has reached an end-condition.
func IsGameFinished(b *Board) bool {
	// The game if finished if none of the players' blocks have a way of reaching any other players' blocks,
	// AND there are no more growing points on the board.
	//
	// Basically, we conduct a breadth-first search from every tower on the board, to see if it can reach
	// any towers owned by other players. We use a few optimizations to make sure we never visit the same
	// point twice, keeping the algorithm linear in time.
	points := make(map[Position]int)           // Maps: point to reachable player.
	unexploredTowers := make(map[Position]int) // Maps: tower position to owning player.
	for pos, point := range b.Points {
		if point.IsDead {
			// Pretend dead points just don't exist.
			continue
		}
		points[pos] = point.Tower.Player // -1 if no tower.
		if point.HasTower() {
			if point.Tower.IsGrowingPoint {
				// The game is never done as long as there are any growing points.
				//fmt.Printf("Position %v is a growing point.\n", pos)
				return false
			}
			unexploredTowers[pos] = point.Tower.Player
		}
	}

	// Breadth-first search from unexplored towers.
	for towerPos, player := range unexploredTowers {
		//fmt.Printf("Starting from tower %v\n", towerPos)
		// The slice 'nextPoints' will eventually contain all the points reachable from 'towerPos'.
		nextPoints := make([]Position, 1, len(b.Points))
		nextPoints[0] = towerPos
		fillNextPoints := func(x, y int) {
			// If 'owningPlayer' is -1, this point is completely unseen. If it's -2, it's already queued.
			// Any other value indicates the point is owned by that player.
			owningPlayer, exists := points[Position{x, y}]
			if exists && owningPlayer != -2 && owningPlayer != player {
				if owningPlayer == -1 {
					// Mark this point as already queued, so we don't queue it again.
					points[Position{x, y}] = -2
				}
				nextPoints = append(nextPoints, Position{x, y})
			}
		}

		for i := 0; i < len(nextPoints); i++ {
			pos := nextPoints[i]
			//fmt.Printf("Depth-first search considering %v: %v...\n", i, pos)
			owningPlayer, _ := points[pos]
			if owningPlayer == -2 || i == 0 {
				points[pos] = player
				forEachNeighbour(pos.X, pos.Y, fillNextPoints)
			} else {
				// The owning player can't be 'player', since else the point would not appear in this position
				// of the list of next points.
				return false // A different player can be reached; the game is not finished.
			}
			// If this were a tower, we've explored it now.
			delete(unexploredTowers, pos)
		}
	}

	// None of the players can reach any of the other player! The game is finished!
	return true
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
		return
	}

	// Determine what way the move is going.
	xdist := toPoint.Position.X - fromPoint.Position.X
	ydist := toPoint.Position.Y - fromPoint.Position.Y
	if xdist == 0 && ydist == 0 { // At least X or Y needs to move.
		return
	}
	if xdist != 0 && ydist != 0 && xdist != ydist { // If X and Y both move, then in the same way.
		return
	}
	dist := max(abs(xdist), abs(ydist))

	// There must be enough blocks on the source point to reach the end point.
	if !fromPoint.HasTower() || fromPoint.Tower.Height < dist {
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
		return false
	}
	var fromPoint, toPoint *Point
	fromPoint = path[0]
	toPoint = path[len(path)-1]

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

func recursiveSegment(b *Board, player int, segs []Position, i int, f func(Turn), t Turn) {
	if i == len(segs) {
		// Base condition: we've picked a move for every segment.
		f(t)
		return
	}
	// Recursive condition: we have another segment to pick a move for.
	seg := segs[i]
	doNextSeg := func(t Turn) {
		recursiveSegment(b, player, segs, i+1, f, t)
	}
	forEverySegmentMove(b, player, seg, t, doNextSeg)
}

// Calls 'f' with every possible turn that 'player' could have now on 'b'.
func ForEveryPossibleTurn(b *Board, player int, f func(Turn)) {
	segs := make([]Position, len(b.Segments))
	{
		i := 0
		for pos, _ := range b.Segments {
			segs[i] = pos
			i++
		}
	}
	recursiveSegment(b, player, segs, 0, f, MakeTurn())
}

// Calls 'f' once for every possible move from 'segment', with that move added to 't'.
func forEverySegmentMove(b *Board, player int, centerPos Position, t Turn, f func(Turn)) {
	// Handle the possibility of not moving on this segment.
	f(t)

	// Generate every move possible from this segment.
	handlePossibleMove := func(m Move) {
		t.Moves[centerPos] = m
		f(t)
		delete(t.Moves, centerPos)
	}
	generatePossibleMoves := func(x, y int) {
		forEveryPointMove(b, player, b.Points[Position{x, y}], handlePossibleMove)
	}
	generatePossibleMoves(centerPos.X, centerPos.Y)
	forEachNeighbour(centerPos.X, centerPos.Y, generatePossibleMoves)
}

func forEveryPointMove(b *Board, player int, p *Point, f func(Move)) {
	if p.IsDead || !p.HasTower() || p.Tower.IsGrowingPoint || p.Tower.Player != player {
		return
	}
	recordPossibleMove := func(x, y int) bool { // Returns true if move was legal.
		toPos := Position{x, y}
		to, exists := b.Points[toPos]
		if !exists || to.IsDead || (to.HasTower() && to.Tower.IsGrowingPoint) {
			// Not a valid move.
			return false
		}
		// Valid move.
		f(Move{From: p.Position, To: toPos})
		return true
	}
	forEachNeighbour(0, 0, func(x, y int) { // Gives us just (1,0), (0,-1), etc.
		// Trace all moves in this direction, stopping as soon as the moves on this line become illegal.
		for dist := 1; dist <= p.Tower.Height; dist++ {
			if !recordPossibleMove(p.Position.X+(x*dist), p.Position.Y+(y*dist)) {
				break
			}
		}
	})
}
