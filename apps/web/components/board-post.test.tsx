import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BoardPost } from './board-post'

const post = {
  id: 'kudos-1',
  author: 'Alex Morgan',
  recipient: 'Jordan Lee',
  message: 'Thanks for helping with the launch.',
  timestamp: '2025-04-16T10:42:00.000Z',
}

function mockSuccessfulApiResponse() {
  const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ id: 'result-1' }),
  } as Response)
  global.fetch = fetchMock
  return fetchMock
}

describe('BoardPost', () => {
  it('[AC-7] adds one emoji reaction and updates its displayed count and selected state', async () => {
    const fetchMock = mockSuccessfulApiResponse()
    render(<BoardPost {...post} reactions={[{ emoji: '👏', count: 2 }]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add 👏 reaction' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos/kudos-1/reactions', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👏' }),
    }))
    expect(await screen.findByRole('button', { name: '👏 3 reactions, selected' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Reaction added.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add reaction' })).not.toBeInTheDocument()
  })

  it('[AC-9] immediately removes a kudos from the board after a lead confirms hiding it', async () => {
    const fetchMock = mockSuccessfulApiResponse()
    const onHidden = jest.fn()
    render(<BoardPost {...post} isTeamLead onHidden={onHidden} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hide kudos from Alex Morgan to Jordan Lee' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Thanks for helping with the launch.')
    fireEvent.click(screen.getByRole('button', { name: 'Hide kudos' }))

    await waitFor(() => expect(screen.queryByRole('article', { name: 'Kudos from Alex Morgan to Jordan Lee' })).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos/kudos-1/hide', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    expect(onHidden).toHaveBeenCalledWith('kudos-1')
    expect(screen.getByText('Kudos hidden. Removed from this board for all active viewers.')).toBeInTheDocument()
  })
})
