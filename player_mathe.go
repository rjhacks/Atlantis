package atlantis

import (
	"fmt"
)

type Mathe struct {
}

func (m Mathe) NextBoard(b *Board, player int) *Board {
	_, bestBoard := m.findMaxWalze(b, player, 2 /* maxDepth */, 0 /* depth */) // Look 2 moves deep.
	return bestBoard
}

// Will look 'maxDepth' moves deep (minimum: 1) to find the most long-term-explosive next move possible.
func (m Mathe) findMaxWalze(b *Board, player, maxDepth, depth int) (bestScore float64, bestBoard *Board) {
	// Recursive case: we must go deeper.
	if depth < maxDepth {
		evaluateNextBoard := func(t Turn) {
			valid, b2 := DoMoves(b, t)
			if !valid {
				panic(fmt.Sprintf("Bad turn generated: %v on %v", t, *b))
			}
			DoAllTopplesAndGrow(b2, player)
			score, _ := m.findMaxWalze(b2, player, maxDepth, depth+1)
			if score > bestScore {
				bestScore = score
				bestBoard = b2
			}
		}
		ForEveryPossibleTurn(b, player, evaluateNextBoard)
		return
	}

	// Base case: we've reached maxDepth, do the actual evaluation.
	// Evaluation criterium: maximum number of growing points, maximum number of dead points.
	for _, point := range b.Points {
		if point.IsDead || (point.HasTower() && point.Tower.IsGrowingPoint) {
			bestScore += 1.0
		}
	}
	return
}
