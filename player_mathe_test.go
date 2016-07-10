package atlantis

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestMathe(test *testing.T) {
	assert := assert.New(test)

	var p Player
	p = Mathe{}

	b := NewBoard()
	b.NewSegment(0, 0)
	b.Points[Position{-1, 0}].Tower = Tower{Player: 0, Height: 2}
	b.Points[Position{0, 0}].Tower = Tower{Player: 0, Height: 1}

	// Mathe sees only one good move here: blow -1,0 up!
	b2 := p.NextBoard(b, 0)
	assert.Equal(Tower{Player: 0, Height: 1, IsGrowingPoint: true}, b2.Points[Position{-1, 0}].Tower)

	// Mathe can look a move ahead to find a good approach.
	b = NewBoard()
	b.NewSegment(0, 0)
	b.Points[Position{-1, 0}].Tower = Tower{Player: 0, Height: 1}
	b.Points[Position{0, 1}].Tower = Tower{Player: 0, Height: 1}
	b.Points[Position{-1, -1}].Tower = Tower{Player: 0, Height: 1}
	b2 = p.NextBoard(b, 0)
	assert.Equal(Tower{Player: 0, Height: 2}, b2.Points[Position{-1, 0}].Tower)
	b3 := p.NextBoard(b2, 0)
	assert.Equal(Tower{Player: 0, Height: 1, IsGrowingPoint: true}, b3.Points[Position{-1, 0}].Tower)

	// If faced with a choice, Mathe will pick the more explosive move.
	b = NewBoard()
	b.NewSegment(0, 0)
	b.Points[Position{1, 0}].Tower = Tower{Player: 0, Height: 2}
	b.Points[Position{0, 1}].Tower = Tower{Player: 0, Height: 1}   // Ripe for a chain reaction!
	b.Points[Position{-1, 0}].Tower = Tower{Player: 0, Height: 1}  // Ripe for a chain reaction!
	b.Points[Position{-1, -1}].Tower = Tower{Player: 0, Height: 1} // Ripe for a chain reaction!
	b2 = p.NextBoard(b, 0)
	assert.True(b2.Points[Position{-1, 0}].IsDead)
}
