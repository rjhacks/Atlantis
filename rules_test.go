package atlantis

import (
	"github.com/stretchr/testify/assert"
	//	"log"
	"fmt"
	"testing"
)

func TestMoves(test *testing.T) {
	assert := assert.New(test)

	b := NewBoard()
	b.FromJSON(simpleBoard)
	assert.True(b.Points[Position{0, 0}].HasTower())

	// Turn with no moves is legal.
	t := MakeTurn()
	legal, b2 := DoMoves(b, t)
	assert.True(legal)

	// Turns with one legal move.
	t.Moves[Position{0, 0}] = Move{From: Position{0, 0}, To: Position{0, 1}}
	legal, b2 = DoMoves(b, t)
	assert.True(legal)
	assert.True(b.Points[Position{0, 0}].HasTower()) // We didn't change the original board.
	assert.False(b2.Points[Position{0, 0}].HasTower())
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{0, 1}].Tower)

	t.Moves[Position{0, 0}] = Move{From: Position{0, 0}, To: Position{0, -1}}
	legal, b2 = DoMoves(b, t)
	assert.True(legal)
	assert.False(b2.Points[Position{0, 0}].HasTower())
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{0, -1}].Tower)

	// Turns with one illegal move.
	t.Moves[Position{0, 0}] = Move{From: Position{0, 0}, To: Position{0, 2}} // Nonexistent to-point.
	legal, _ = DoMoves(b, t)
	assert.False(legal)

	t.Moves[Position{0, 0}] = Move{From: Position{1, 0}, To: Position{2, 0}} // No tower at from-point.
	legal, _ = DoMoves(b, t)
	assert.False(legal)

	t.Moves[Position{0, 0}] = Move{From: Position{0, 0}, To: Position{2, 0}} // Too far away.
	legal, _ = DoMoves(b, t)
	assert.False(legal)

	t = MakeTurn()
	t.Moves[Position{3, 1}] = Move{From: Position{3, 1}, To: Position{1, 0}} // X and Y moves mismatch.
	legal, _ = DoMoves(b, t)
	assert.False(legal)

	// Turn with two legal moves, which combine a tower.
	t.Moves[Position{0, 0}] = Move{From: Position{0, 0}, To: Position{0, 1}}
	t.Moves[Position{3, 1}] = Move{From: Position{3, 1}, To: Position{0, 1}}
	legal, b2 = DoMoves(b, t)
	assert.True(legal)
	assert.False(b2.Points[Position{0, 0}].HasTower())
	assert.False(b2.Points[Position{3, 1}].HasTower())
	assert.Equal(Tower{Player: 0, Height: 4}, b2.Points[Position{0, 1}].Tower)

	// Legal move that splits a tower.
	t.Moves[Position{3, 1}] = Move{From: Position{3, 1}, To: Position{1, 1}}
	legal, b2 = DoMoves(b, t)
	assert.True(legal)
	assert.False(b2.Points[Position{0, 0}].HasTower())
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{0, 1}].Tower)
	assert.Equal(Tower{Player: 0, Height: 2}, b2.Points[Position{1, 1}].Tower)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{3, 1}].Tower)

	// Legal move that eliminates blocks.
	t = MakeTurn()
	t.Moves[Position{3, 1}] = Move{From: Position{3, 1}, To: Position{3, -1}}
	legal, b2 = DoMoves(b, t)
	assert.True(legal)
	assert.False(b2.Points[Position{3, -1}].HasTower()) // Both towers eliminated.
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{3, 1}].Tower)

	// Legal move that eliminates blocks.
	t.Moves[Position{3, 1}] = Move{From: Position{3, 1}, To: Position{3, -2}}
	legal, b2 = DoMoves(b, t)
	assert.True(legal)
	assert.False(b2.Points[Position{3, 1}].HasTower())
	assert.False(b2.Points[Position{3, -1}].HasTower()) // Player 1's tower eliminated.
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{3, -2}].Tower)
}

func TestToppleAndGrow(test *testing.T) {
	assert := assert.New(test)

	b := NewBoard()
	b.FromJSON(simpleBoard)
	assert.True(b.Points[Position{0, 0}].HasTower())

	// No toppling.
	assert.False(DoAllTopplesAndGrow(b, 0))

	// Move a tower to a corner where it'll topple. No growing/dead points present.
	t := MakeTurn()
	t.Moves[Position{3, 1}] = Move{From: Position{3, 1}, To: Position{0, 1}}
	legal, b2 := DoMoves(b, t)
	assert.True(legal)
	assert.Equal(Tower{Player: 0, Height: 3}, b2.Points[Position{0, 1}].Tower)
	assert.True(DoAllTopplesAndGrow(b2, 0))
	assert.Equal(Tower{Player: 0, Height: 1, IsGrowingPoint: true}, b2.Points[Position{0, 1}].Tower)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{-1, 0}].Tower)
	assert.Equal(Tower{Player: 0, Height: 2}, b2.Points[Position{0, 0}].Tower)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{1, 1}].Tower)

	// Remove the non-growing-points to avoid further chain reactions, then show that growing does grow
	// and eventually again topples the growing point.
	b2.Points[Position{-1, 0}].Tower = Tower{Player: -1}
	b2.Points[Position{0, 0}].Tower = Tower{Player: -1}
	b2.Points[Position{1, 1}].Tower = Tower{Player: -1}
	assert.True(DoAllTopplesAndGrow(b2, 0))
	assert.Equal(Tower{Player: 0, Height: 2, IsGrowingPoint: true}, b2.Points[Position{0, 1}].Tower)
	assert.True(DoAllTopplesAndGrow(b2, 0))
	assert.Equal(Tower{Player: 0, Height: 3, IsGrowingPoint: true}, b2.Points[Position{0, 1}].Tower)
	assert.True(DoAllTopplesAndGrow(b2, 0))
	assert.True(b2.Points[Position{0, 1}].IsDead)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{-1, 0}].Tower)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{0, 0}].Tower)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{1, 1}].Tower)

	// Same, but with chain reactions relying on the new growing point as not being counted as a neighbour.
	t.Moves[Position{0, 0}] = Move{From: Position{0, 0}, To: Position{-1, 0}}
	legal, b2 = DoMoves(b, t)
	assert.True(legal)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{-1, 0}].Tower)
	assert.Equal(Tower{Player: 0, Height: 3}, b2.Points[Position{0, 1}].Tower)
	assert.True(DoAllTopplesAndGrow(b2, 0))
	assert.Equal(Tower{Player: 0, Height: 1, IsGrowingPoint: true}, b2.Points[Position{0, 1}].Tower)
	assert.Equal(Tower{Player: 0, Height: 1, IsGrowingPoint: true}, b2.Points[Position{-1, 0}].Tower)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{-1, -1}].Tower)
	assert.Equal(Tower{Player: 0, Height: 2}, b2.Points[Position{0, 0}].Tower)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{1, 1}].Tower)

	// Remove the non-growing-points to avoid further chain reactions, then show that growing does grow
	// and eventually again topples the growing points.
	b2.Points[Position{-1, -1}].Tower = Tower{Player: -1}
	b2.Points[Position{0, 0}].Tower = Tower{Player: -1}
	b2.Points[Position{1, 1}].Tower = Tower{Player: -1}
	assert.True(DoAllTopplesAndGrow(b2, 0))
	assert.Equal(Tower{Player: 0, Height: 2, IsGrowingPoint: true}, b2.Points[Position{0, 1}].Tower)
	assert.Equal(Tower{Player: 0, Height: 2, IsGrowingPoint: true}, b2.Points[Position{-1, 0}].Tower)
	assert.True(DoAllTopplesAndGrow(b2, 0))
	assert.True(b2.Points[Position{0, 1}].IsDead)
	assert.True(b2.Points[Position{-1, 0}].IsDead)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{-1, -1}].Tower)
	assert.Equal(Tower{Player: 0, Height: 2}, b2.Points[Position{0, 0}].Tower)
	assert.Equal(Tower{Player: 0, Height: 1}, b2.Points[Position{1, 1}].Tower)
}

func TestEveryMove(test *testing.T) {
	assert := assert.New(test)

	b := NewBoard()
	b.NewSegment(0, 0)

	// A board with no towers on it has only one possible move: do nothing.
	countPlayerMoves := func(player int) int {
		m := make(map[string]Turn)
		addToMap := func(t Turn) {
			s := fmt.Sprintf("%#v", t)
			_, hasTurn := m[s]
			assert.False(hasTurn, "Already have turn: "+s)
			m[s] = t
		}
		ForEveryPossibleTurn(b, player, addToMap)
		return len(m)
	}
	countMoves := func() int { return countPlayerMoves(0) }
	assert.Equal(1, countMoves())

	// A board with one tower in the middle of one segment has 7 possible moves.
	b.Points[Position{0, 0}].Tower = Tower{Player: 0, Height: 1}
	assert.Equal(7, countMoves())

	// A different player with no blocks won't have any moves though.
	assert.Equal(1, countPlayerMoves(1))

	// Ditto if the tower is 2 blocks high, because it won't be able to move both blocks.
	b.Points[Position{0, 0}].Tower.Height = 2
	assert.Equal(7, countMoves())
	assert.Equal(1, countPlayerMoves(1))

	// A board with one tower on the edge of one segment has fewer degrees of freedom.
	b.Points[Position{0, 0}].Tower = Tower{Player: -1}
	b.Points[Position{-1, -1}].Tower = Tower{Player: 0, Height: 1}
	assert.Equal(4, countMoves())

	// A tower of two in that corner can move to the opposite corner as well.
	b.Points[Position{-1, -1}].Tower.Height = 2
	assert.Equal(5, countMoves())

	// If there are two towers, their number of moves are added. However, the "no move" counts only once.
	b.Points[Position{1, 0}].Tower = Tower{Player: 0, Height: 2}
	assert.Equal(4+4+1, countMoves())

	// Adding a segment increases the movement options for the tower at 1,0.
	b.NewSegment(3, 1)
	assert.Equal(4+8+1, countMoves())

	// If there's a tower on the other segment its options multiply with the first segment.
	b.Points[Position{3, 0}].Tower = Tower{Player: 0, Height: 1}
	assert.Equal((4+8+1)*4, countMoves())

	// Different players still ignore each others' towers in the movement options.
	b.Points[Position{3, 0}].Tower.Player = 1
	assert.Equal(4+8+1, countPlayerMoves(0))
	assert.Equal(4, countPlayerMoves(1))

	// Growing points can't be moved onto or across, and impede movement.
	b.Points[Position{2, 0}].Tower = Tower{Player: 1, Height: 1, IsGrowingPoint: true}
	assert.Equal(4+6+1, countPlayerMoves(0))
	assert.Equal(3, countPlayerMoves(1))

	// As do dead points.
	b.Points[Position{2, 0}].Tower = Tower{Player: -1}
	b.Points[Position{2, 0}].IsDead = true
	assert.Equal(4+6+1, countPlayerMoves(0))
	assert.Equal(3, countPlayerMoves(1))
}

func TestIsGameFinished(test *testing.T) {
	assert := assert.New(test)

	b := NewBoard()

	// A board with no segments is a finished game.
	assert.True(IsGameFinished(b))

	// A board with no players on it is a finished game.
	b.NewSegment(0, 0)
	assert.True(IsGameFinished(b))

	// A board with only a single player on it constitutes a finished game.
	b.Points[Position{-1, -1}].Tower = Tower{Player: 0, Height: 1}
	assert.True(IsGameFinished(b))

	// But with two players present the game is not finished.
	b.Points[Position{1, 1}].Tower = Tower{Player: 1, Height: 1}
	assert.False(IsGameFinished(b))

	// Also not if they're almost separated.
	b.Points[Position{0, 0}].IsDead = true
	b.Points[Position{0, 1}].IsDead = true
	assert.False(IsGameFinished(b))

	// Also not if they're separated but the thing separating them is a growing point.
	b.Points[Position{0, -1}].Tower = Tower{Player: 1, Height: 1, IsGrowingPoint: true}
	assert.False(IsGameFinished(b))

	// Also not if completely separated by dead points but there is still a growing point in play.
	b.Points[Position{1, 0}].IsDead = true
	assert.False(IsGameFinished(b))

	// But yes again if they're completely separated and there's no growing points.
	b.Points[Position{0, -1}].Tower = Tower{Player: -1}
	assert.True(IsGameFinished(b))
}

var simpleBoard = `{
  "segments" : [ {
    "x" : 0,
    "y" : 0
  }, {
    "x" : 3,
    "y" : 1
  }, {
    "x" : 4,
    "y" : -1
  } ],
  "towers" : [ {
    "height" : 1,
    "player" : 0,
    "position" : {
      "x" : 0,
      "y" : 0
    }
  }, {
    "height" : 3,
    "player" : 0,
    "position" : {
      "x" : 3,
      "y" : 1
    }
  }, {
    "height" : 2,
    "player" : 1,
    "position" : {
      "x" : 3,
      "y" : -1
    }
  } ]
}`
