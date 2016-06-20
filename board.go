package atlantis

// Rules to keep gopherjs happy:
// - The only methods that are available from JS are...
//   (1) Those explicitly exported in main().
//   (2) Those on objects returned by MakeWrapper().
//   Hence, the JS should be structured to not do atlantis.Foo().Bar().Baz(),,
//   but instead do no more than atlantis.Foo().Bar().
// - Structs that are returned without MakeWrapper become plain JS Objects. Their
//   members are directly accessible, but they don't have methods. They should
//   probably embed *js.Object and use `js` tags to control their naming in JS.
// - Structs returned as *js.Object do not contain their nested structs. Consider
//   using json.Marshal instead.

import (
	"encoding/json"
	"fmt"
	//"github.com/gopherjs/gopherjs/js"
	//"io"
	"log"
	//"strings"
)

type Tower struct {
	//*js.Object
	Player         int  `json:"player"`
	Height         int  `json:"height"`
	IsGrowingPoint bool `json:"is_growing_point"`
}

func (t *Tower) DebugString() string {
	return fmt.Sprintf("player: %v, height: %v, growing: %v", t.Player, t.Height, t.IsGrowingPoint)
}

type Position struct {
	//*js.Object
	X int `json:"x"` //`js:"x"`
	Y int `json:"y"` //`js:"y"`
}

func (pos *Position) DebugString() string {
	return fmt.Sprintf("(%v,%v)", pos.X, pos.Y)
}

type Point struct {
	//*js.Object
	Position Position
	tower    *Tower
	IsDead   bool
}

func (p *Point) HasTower() bool {
	return p.tower != nil && p.tower.Player >= 0
}

func (p *Point) Tower() *Tower {
	if !p.HasTower() {
		p.tower = &Tower{Player: -1, Height: 0, IsGrowingPoint: false}
	}
	return p.tower
}

type Segment struct {
	//*js.Object
	//Center Position
	CenterX int `json:"x"` //`js:"center_x" json:"x"`
	CenterY int `json:"y"` //`js:"center_y" json:"y"`
	Points  [7]*Point
}

func (s *Segment) DebugString() string {
	return fmt.Sprintf("Segment %v,%v", s.CenterX, s.CenterY)
}

type Board struct {
	Segments map[Position]*Segment
	Points   map[Position]*Point
}

func (b *Board) NewPoint(x int, y int) *Point {
	var p Point
	p.Position = Position{X: x, Y: y}
	b.Points[p.Position] = &p
	return &p
}

func forEachNeighbour(x int, y int, f func(int, int)) {
	f(x-1, y-1)
	f(x-1, y)
	f(x, y-1)
	f(x, y+1)
	f(x+1, y)
	f(x+1, y+1)
}

func (b *Board) NewSegment(centerX int, centerY int) {
	seg := Segment{CenterX: centerX, CenterY: centerY}
	i := 0
	addPoint := func(x int, y int) {
		seg.Points[i] = b.NewPoint(x, y)
		i++
	}
	addPoint(centerX, centerY)
	forEachNeighbour(centerX, centerY, addPoint)
	b.Segments[Position{X: centerX, Y: centerY}] = &seg
}

// When serialized to JSON, the format of the board is slightly different than what we use internally.
// These types and methods fill the gap.
type serializedTower struct {
	*Tower
	Position Position `json:"position"`
}
type serializedDeadPoint struct {
	Position Position `json:"position"`
}
type SerializedBoard struct {
	Segments   []Position            `json:"segments"`
	Towers     []serializedTower     `json:"towers"`
	DeadPoints []serializedDeadPoint `json:"dead_points"`
}

func (b *Board) FromSerializedBoard(sb SerializedBoard) {
	for _, seg := range sb.Segments {
		b.NewSegment(seg.X, seg.Y)
	}
	for _, t := range sb.Towers {
		point, hasPoint := b.Points[t.Position]
		if !hasPoint {
			log.Fatal(fmt.Sprintf("FromJSON: Missing point %v,%v", t.Position.X, t.Position.Y))
		}
		*point.Tower() = *t.Tower
	}
	for _, d := range sb.DeadPoints {
		point, hasPoint := b.Points[d.Position]
		if !hasPoint {
			log.Fatal(fmt.Sprintf("FromJSON: Missing dead point %v,%v", d.Position.X, d.Position.Y))
		}
		point.IsDead = true
	}
}

func (b *Board) FromJSON(jsonStream string) {
	b.Clear()
	var sb SerializedBoard
	if err := json.Unmarshal([]byte(jsonStream), &sb); err != nil {
		log.Fatal(err)
	}
	b.FromSerializedBoard(sb)
}

func (b *Board) ToSerializedBoard() SerializedBoard {
	var sb SerializedBoard
	sb.Segments = make([]Position, 0, len(b.Segments))
	sb.Towers = make([]serializedTower, 0, len(b.Points))
	sb.DeadPoints = make([]serializedDeadPoint, 0, len(b.Points))

	for _, seg := range b.Segments {
		sb.Segments = append(sb.Segments, Position{X: seg.CenterX, Y: seg.CenterY})
	}
	for _, point := range b.Points {
		if point.HasTower() {
			sb.Towers = append(sb.Towers, serializedTower{Tower: point.Tower(), Position: point.Position})
		}
		if point.IsDead {
			sb.DeadPoints = append(sb.DeadPoints, serializedDeadPoint{Position: point.Position})
		}
	}
	return sb
}

func (b *Board) ToJSON() string {
	str, err := json.Marshal(b.ToSerializedBoard())
	if err != nil {
		return fmt.Sprintf("%v", err)
	}
	return string(str)
}

func (b *Board) DebugString() string {
	var out string
	for _, seg := range b.Segments {
		// TODO(rjhacks): concat can be done more efficiently.
		out += fmt.Sprintf("Segment %v,%v has %v points\n", seg.CenterX, seg.CenterY, len(seg.Points))
		for _, p := range seg.Points {
			if !p.HasTower() {
				continue
			}
			t := p.Tower()
			out += "- Tower at " + p.Position.DebugString() + ": " + t.DebugString() + "\n"
		}
	}
	return out
}

func (b *Board) Clear() {
	b.Segments = make(map[Position]*Segment)
	b.Points = make(map[Position]*Point)
}

func NewBoard() *Board {
	var b Board
	b.Clear()
	return &b
}
