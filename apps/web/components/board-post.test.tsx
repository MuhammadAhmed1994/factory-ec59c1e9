import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BoardPost } from './board-post'

afterEach(() => {
  jest.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'fetch')
})

function mockApiSuccess(body: unknown) {
  const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response)
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetchMock })
  return fetchMock
}

function renderPost(isTeamLead = false) {
  return render(
    <BoardPost
      id="kudos-42"
      author="Alex Morgan"
      recipient="Jordan Lee"
      message="Thanks for helping with the launch."
      timestamp="2025-04-16T10:42:00.000Z"
      reactions={[{ emoji: '👏', count: 2 }]}
      isSignedIn
      isTeamLead={isTeamLead}
    />,
  )
}

describe('board post controls', () => {
  it('[AC-7] adds an emoji reaction and updates its count and pressed state', async () => {
    const fetchMock = mockApiSuccess({ id: 'r-1', emoji: '👏' })
    renderPost()

    fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }))
    fireEvent.click(screen.getByRole('button', { name: 'React with 👏' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/kudos/kudos-42/reactions',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ emoji: '👏' }) }),
    ))
    expect(await screen.findByRole('button', { name: '👏, 3 reactions, selected' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Add reaction' })).not.toBeInTheDocument()
    expect(screen.getByText('Reaction added.')).toBeInTheDocument()
  })

  it('[AC-9] removes a hidden kudos from the board immediately after confirmation', async () => {
    const fetchMock = mockApiSuccess({ id: 'kudos-42', isHidden: true })
    renderPost(true)

    fireEvent.click(screen.getByRole('button', { name: 'Hide kudos from Alex Morgan to Jordan Lee' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText('Thanks for helping with the launch.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hide kudos' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/kudos/kudos-42/hide',
      expect.objectContaining({ method: 'POST' }),
    ))
    expect(await screen.findByRole('status')).toHaveTextContent('Kudos hidden.')
    expect(screen.queryByRole('article', { name: 'Kudos from Alex Morgan to Jordan Lee' })).not.toBeInTheDocument()
  })
})
