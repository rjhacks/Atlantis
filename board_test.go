package atlantis

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestCreateBoard(t *testing.T) {
	assert := assert.New(t)

	b := NewBoard()
	b.NewSegment(0, 0)
	assert.Equal(len(b.Segments), 1)
	assert.Equal(len(b.Points), 7)
	b.NewSegment(3, 1)
	assert.Equal(len(b.Segments), 2)
	assert.Equal(len(b.Points), 2*7)
}

func TestCreateBoardFromJSON(t *testing.T) {
	assert := assert.New(t)
	assert.NotEqual(serializedBoard, "")

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
	assert.Equal(len(b.Segments), 4)
	assert.Equal(len(b.Points), 4*7)

	pos := Position{X: 6, Y: 6}
	assert.Equal(b.Points[pos].Position, pos)
	assert.Equal(b.Points[pos].IsDead, false)
	assert.Equal(b.Points[pos].Tower().Player, 0)
	assert.Equal(b.Points[pos].Tower().Height, 1)
	assert.Equal(b.Points[pos].Tower().IsGrowingPoint, false)

	pos = Position{X: 7, Y: 7}
	assert.Equal(b.Points[pos].Position, pos)
	assert.Equal(b.Points[pos].IsDead, false)
	assert.Equal(b.Points[pos].Tower().Player, 0)
	assert.Equal(b.Points[pos].Tower().Height, 2)
	assert.Equal(b.Points[pos].Tower().IsGrowingPoint, true)

	pos = Position{X: 10, Y: 5}
	assert.Equal(b.Points[pos].Position, pos)
	assert.Equal(b.Points[pos].IsDead, false)
	assert.Equal(b.Points[pos].Tower().Player, 1)
	assert.Equal(b.Points[pos].Tower().Height, 1)
	assert.Equal(b.Points[pos].Tower().IsGrowingPoint, false)

	pos = Position{X: 11, Y: 6}
	assert.Equal(b.Points[pos].Position, pos)
	assert.Equal(b.Points[pos].IsDead, false)
	assert.Equal(b.Points[pos].Tower().Player, 1)
	assert.Equal(b.Points[pos].Tower().Height, 2)
	assert.Equal(b.Points[pos].Tower().IsGrowingPoint, true)

	pos = Position{X: 8, Y: 5}
	assert.Equal(b.Points[pos].Position, pos)
	assert.Equal(b.Points[pos].IsDead, true)

	pos = Position{X: 10, Y: 8}
	assert.Equal(b.Points[pos].Position, pos)
	assert.Equal(b.Points[pos].IsDead, true)

	assert.NotEqual(b.DebugString(), "")
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
