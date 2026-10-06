import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BoardPost } from './board-post'

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = fetchMock

const basePost = {
  id: 'kudos-42',
  author: 'Alex Morgan',
  recipient: 'Jordan Lee',
  message: 'Thanks for helping unblock the launch!',
  timestamp: '2025-04-16T10:42:00.000Z',
  signedIn: true,
}

beforeEach(() => fetchMock.mockReset())

describe('Board post reactions and moderation', () => {
  it('[AC-7] adds a reaction and updates its displayed count and selected state', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ emoji: '👏' }) } as Response)
    render(<BoardPost {...basePost} reactions={[{ emoji: '👏', count: 1 }]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }))
    fireEvent.click(screen.getByRole('button', { name: 'React with 👏' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos/kudos-42/reactions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ emoji: '👏' }),
    })))
    const reaction = await screen.findByRole('button', { name: '👏 2 reactions, selected' })
    expect(reaction).toHaveAttribute('aria-pressed', 'true')
    expect(reaction).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Reaction added.')
  })

  it('[AC-9] removes a hidden kudos from the board immediately after confirmation', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) } as Response)
    render(<BoardPost {...basePost} isTeamLead />)

    const hideTrigger = screen.getByRole('button', { name: 'Hide kudos from Alex Morgan to Jordan Lee' })
    hideTrigger.focus()
    fireEvent.click(hideTrigger)
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Thanks for helping unblock the launch!')

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(hideTrigger).toHaveFocus()

    fireEvent.click(hideTrigger)
    fireEvent.click(screen.getByRole('button', { name: 'Hide kudos', hidden: true }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos/kudos-42/hide', expect.objectContaining({ method: 'POST' })))
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Kudos from Alex Morgan to Jordan Lee' })).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Kudos hidden. Removed from this board for all active viewers.')
  })
})
