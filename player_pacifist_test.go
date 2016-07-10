package atlantis

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestPacifist(test *testing.T) {
	assert := assert.New(test)

	b := NewBoard()
	b.NewSegment(0, 0)
	b.Points[Position{-1, 0}].Tower = Tower{Player: 0, Height: 1}

	var p Player
	p = Pacifist{}

	// Stupidest sanity-check ever: pacifists don't do anything.
	b2 := p.NextBoard(b, 0)
	assert.Equal(b, b2) // Exact same pointer
}
