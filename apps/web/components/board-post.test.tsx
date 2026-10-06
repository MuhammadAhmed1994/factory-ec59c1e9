import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BoardPost } from './board-post'

const post = {
  id: 'kudos-42',
  author: 'Alex Morgan',
  recipient: 'Jordan Lee',
  message: 'Thanks for helping unblock the launch!',
  createdAt: '2025-04-16T10:42:00.000Z',
}

it('[AC-7] adds one emoji and updates its displayed count and selected state', async () => {
  const addReaction = async (_emoji: string) => undefined
  render(<BoardPost post={post} isSignedIn onAddReaction={addReaction} />)

  fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }))
  fireEvent.click(screen.getByRole('button', { name: '👏 Clap' }))

  const added = await screen.findByRole('button', { name: '👏 1 reaction, selected' })
  expect(added).toHaveAttribute('aria-pressed', 'true')
  expect(added).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Add reaction' })).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Reaction added.')
})

it('[AC-9] removes the hidden kudos from the board immediately after lead confirmation', async () => {
  const hideKudos = async () => undefined
  render(<BoardPost post={post} isSignedIn isTeamLead onHideKudos={hideKudos} />)

  fireEvent.click(screen.getByRole('button', { name: 'Hide kudos from Alex Morgan to Jordan Lee' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('Alex Morgan recognized Jordan Lee')
  expect(screen.getByRole('dialog')).toHaveTextContent('Thanks for helping unblock the launch!')
  fireEvent.click(screen.getByRole('button', { name: 'Hide kudos' }))

  await waitFor(() => expect(screen.queryByRole('article', { name: 'Kudos from Alex Morgan to Jordan Lee' })).not.toBeInTheDocument())
  expect(screen.getByRole('status')).toHaveTextContent('Kudos hidden.')
})
