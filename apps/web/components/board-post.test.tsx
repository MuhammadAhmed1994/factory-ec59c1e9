import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BoardPost } from './board-post'

const post = {
  id: 'kudos-42',
  author: 'Alex Morgan',
  recipient: 'Jordan Lee',
  message: 'Thanks for helping unblock the launch.',
  timestamp: '2025-04-16T10:42:00.000Z',
}

it('[AC-7] adds an emoji reaction and displays its updated count and selected state', async () => {
  const onAddReaction = jest.fn(async (_emoji: string) => ({ id: 'reaction-1' }))
  render(<BoardPost {...post} reactions={[{ emoji: '❤️', count: 2 }]} onAddReaction={onAddReaction} />)

  fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }))
  fireEvent.click(screen.getByRole('button', { name: 'React with ❤️' }))

  const selectedReaction = await screen.findByRole('button', { name: '❤️, 3 reactions, selected' })
  expect(selectedReaction).toHaveAttribute('aria-pressed', 'true')
  expect(onAddReaction).toHaveBeenCalledWith('❤️')
  expect(screen.queryByRole('button', { name: 'Add reaction' })).not.toBeInTheDocument()
})

it('[AC-9] removes the kudos from the board immediately after a lead confirms hiding it', async () => {
  const onHide = jest.fn(async () => undefined)
  const onRemoved = jest.fn()
  render(<BoardPost {...post} isTeamLead onHide={onHide} onRemoved={onRemoved} />)

  fireEvent.click(screen.getByRole('button', { name: 'Hide kudos from Alex Morgan to Jordan Lee' }))
  const dialog = screen.getByRole('alertdialog')
  expect(dialog).toHaveTextContent('Alex Morgan')
  expect(dialog).toHaveTextContent('Jordan Lee')
  expect(dialog).toHaveTextContent(post.message)
  fireEvent.click(screen.getByRole('button', { name: 'Confirm hide kudos' }))

  await waitFor(() => expect(screen.queryByRole('article', { name: 'Kudos from Alex Morgan to Jordan Lee' })).not.toBeInTheDocument())
  expect(onHide).toHaveBeenCalledTimes(1)
  expect(onRemoved).toHaveBeenCalledWith(post.id)
  expect(screen.getByRole('status')).toHaveTextContent('Kudos hidden.')
})
