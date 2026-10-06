import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BoardPost } from './board-post'

afterEach(() => {
  cleanup()
  jest.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'fetch')
})

const post = {
  id: 'kudos-42',
  author: 'Alex Morgan',
  recipient: 'Jordan Lee',
  message: 'Thanks for helping unblock the launch.',
  timestamp: '2025-04-16T10:42:00.000Z',
  reactions: [{ emoji: '👏', count: 2 }, { emoji: '❤️', count: 2 }],
}

function mockFetch(payload: object) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => payload,
  } as Response)
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetchMock })
  return fetchMock
}

it('[AC-7] adds one emoji reaction and displays its updated count and selected state', async () => {
  const fetchMock = mockFetch({ emoji: '❤️' })
  render(<BoardPost {...post} />)

  fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add ❤️ reaction' }))

  const addedReaction = await screen.findByRole('button', { name: '❤️, 3 reactions, selected' })
  expect(addedReaction).toHaveAttribute('aria-pressed', 'true')
  expect(addedReaction).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Add reaction' })).not.toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:3000/kudos/kudos-42/reactions',
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ emoji: '❤️' }) }),
  )
})

it('[AC-9] immediately removes hidden kudos from the board and announces confirmation', async () => {
  const fetchMock = mockFetch({ id: post.id, isHidden: true })
  render(<BoardPost {...post} isTeamLead />)

  fireEvent.click(screen.getByRole('button', { name: 'Hide kudos from Alex Morgan to Jordan Lee' }))
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Alex Morgan')
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Jordan Lee')
  expect(screen.getByRole('alertdialog')).toHaveTextContent(post.message)
  fireEvent.click(screen.getByRole('button', { name: 'Hide kudos' }))

  expect(await screen.findByText('Kudos hidden. Removed from this board for all active viewers.')).toHaveAttribute('role', 'status')
  expect(screen.queryByRole('article', { name: 'Kudos from Alex Morgan to Jordan Lee' })).not.toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:3000/kudos/kudos-42/hide',
    expect.objectContaining({ method: 'POST' }),
  )
})
