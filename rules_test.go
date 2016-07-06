package atlantis

import (
	"github.com/stretchr/testify/assert"
	//	"log"
	"testing"
)

func TestMoves(test *testing.T) {
	assert := assert.New(test)
	assert.NotEqual(serializedBoard, "")

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
	assert.NotEqual(serializedBoard, "")

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
