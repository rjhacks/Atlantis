package atlantis

type Pacifist struct{}

func (p Pacifist) NextBoard(b *Board, player int) *Board {
	return b
}
