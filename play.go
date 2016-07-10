package atlantis

type Player interface {
	NextBoard(b *Board, player int) *Board
}
