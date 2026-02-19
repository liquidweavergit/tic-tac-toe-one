import { render, screen, fireEvent } from '@testing-library/react';
import { Board } from '../components/Board';

const emptyBoard = Array(9).fill(null) as (null | 'x' | 'o')[];

it('renders 9 cells', () => {
  render(<Board board={emptyBoard} activePlayer="x" myTurn={true} previewCell={null} onCellClick={() => {}} winningCells={null} />);
  expect(screen.getAllByRole('button')).toHaveLength(9);
});

it('calls onCellClick with the cell index', () => {
  const onClick = vi.fn();
  render(<Board board={emptyBoard} activePlayer="x" myTurn={true} previewCell={null} onCellClick={onClick} winningCells={null} />);
  fireEvent.click(screen.getAllByRole('button')[4]);
  expect(onClick).toHaveBeenCalledWith(4);
});

it('does not call onCellClick when not my turn', () => {
  const onClick = vi.fn();
  render(<Board board={emptyBoard} activePlayer="x" myTurn={false} previewCell={null} onCellClick={onClick} winningCells={null} />);
  fireEvent.click(screen.getAllByRole('button')[0]);
  expect(onClick).not.toHaveBeenCalled();
});
