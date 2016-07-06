package atlantis

import (
	//	"fmt"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestCreateBoard(t *testing.T) {
	assert := assert.New(t)

	b := NewBoard()
	b.NewSegment(0, 0)
	assert.Equal(1, len(b.Segments))
	assert.Equal(7, len(b.Points))
	b.NewSegment(3, 1)
	assert.Equal(2, len(b.Segments))
	assert.Equal(2*7, len(b.Points))
}

func TestCreateBoardFromJSON(t *testing.T) {
	assert := assert.New(t)
	assert.NotEqual("", serializedBoard)

	b := NewBoard()
	b.FromJSON(serializedBoard)
	VerifyDeserializedBoard(b, assert)
}

func TestFromToJSON(t *testing.T) {
	assert := assert.New(t)

	b := NewBoard()
	b.FromJSON(serializedBoard)
	reserialized := b.ToJSON()

	b2 := NewBoard()
	b2.FromJSON(reserialized)
	VerifyDeserializedBoard(b2, assert)
}

func VerifyDeserializedBoard(b *Board, assert *assert.Assertions) {
	assert.Equal(4, len(b.Segments))
	assert.Equal(4*7, len(b.Points))

	pos := Position{X: 6, Y: 6}
	assert.Equal(pos, b.Points[pos].Position)
	assert.Equal(false, b.Points[pos].IsDead)
	assert.Equal(0, b.Points[pos].Tower.Player)
	assert.Equal(1, b.Points[pos].Tower.Height)
	assert.Equal(false, b.Points[pos].Tower.IsGrowingPoint)

	pos = Position{X: 7, Y: 7}
	assert.Equal(pos, b.Points[pos].Position)
	assert.Equal(false, b.Points[pos].IsDead)
	assert.Equal(0, b.Points[pos].Tower.Player)
	assert.Equal(2, b.Points[pos].Tower.Height)
	assert.Equal(true, b.Points[pos].Tower.IsGrowingPoint)

	pos = Position{X: 10, Y: 5}
	assert.Equal(pos, b.Points[pos].Position)
	assert.Equal(false, b.Points[pos].IsDead)
	assert.Equal(1, b.Points[pos].Tower.Player)
	assert.Equal(1, b.Points[pos].Tower.Height)
	assert.Equal(false, b.Points[pos].Tower.IsGrowingPoint)

	pos = Position{X: 11, Y: 6}
	assert.Equal(pos, b.Points[pos].Position)
	assert.Equal(false, b.Points[pos].IsDead)
	assert.Equal(1, b.Points[pos].Tower.Player)
	assert.Equal(2, b.Points[pos].Tower.Height)
	assert.Equal(true, b.Points[pos].Tower.IsGrowingPoint)

	pos = Position{X: 8, Y: 5}
	assert.Equal(pos, b.Points[pos].Position)
	assert.Equal(true, b.Points[pos].IsDead)

	pos = Position{X: 10, Y: 8}
	assert.Equal(pos, b.Points[pos].Position)
	assert.Equal(true, b.Points[pos].IsDead)

	assert.NotEqual("", b.DebugString())
}

var serializedBoard = `{
  "segments" : [ {
    "x" : 7,
    "y" : 7
  }, {
    "x" : 8,
    "y" : 5
  }, {
    "x" : 10,
    "y" : 8
  }, {
    "x" : 11,
    "y" : 6
  } ],
  "towers" : [ {
    "height" : 2,
    "is_growing_point" : true,
    "player" : 0,
    "position" : {
      "x" : 7,
      "y" : 7
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 6,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 6,
      "y" : 7
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 7,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 7,
      "y" : 8
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 8,
      "y" : 7
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 8,
      "y" : 8
    }
  }, {
    "height" : 2,
    "is_growing_point" : true,
    "player" : 1,
    "position" : {
      "x" : 11,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 10,
      "y" : 5
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 10,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 11,
      "y" : 5
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 11,
      "y" : 7
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 12,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 12,
      "y" : 7
    }
  } ],
	"dead_points" : [ {
		"position" : {
			"x" : 8,
			"y" : 5
		}
	}, {
		"position" : {
			"x" : 10,
			"y" : 8
		}
	} ]
}`

var serializedBoard2 = `{
  "segments" : [ {
    "x" : 7,
    "y" : 7
  }, {
    "x" : 8,
    "y" : 5
  }, {
    "x" : 10,
    "y" : 8
  }, {
    "x" : 11,
    "y" : 6
  } ],
  "towers" : [ {
    "height" : 2,
    "is_growing_point" : true,
    "player" : 0,
    "position" : {
      "x" : 7,
      "y" : 7
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 6,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 6,
      "y" : 7
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 7,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 7,
      "y" : 8
    }
  }, {
    "height" : 2,
    "is_growing_point" : false,
    "player" : 0,
    "position" : {
      "x" : 8,
      "y" : 8
    }
  }, {
    "height" : 2,
    "is_growing_point" : true,
    "player" : 1,
    "position" : {
      "x" : 11,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 10,
      "y" : 5
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 10,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 11,
      "y" : 5
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 11,
      "y" : 7
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 12,
      "y" : 6
    }
  }, {
    "height" : 1,
    "is_growing_point" : false,
    "player" : 1,
    "position" : {
      "x" : 12,
      "y" : 7
    }
  } ],
	"dead_points" : [ {
		"position" : {
			"x" : 8,
			"y" : 5
		}
	}, {
		"position" : {
			"x" : 10,
			"y" : 8
		}
	} ]
}`
