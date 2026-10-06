import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { BoardPost, type BoardPostProps } from './board-post'

const fetchMock = jest.fn<typeof fetch>()
const post: Omit<BoardPostProps, 'onHidden'> = {
  id: 'kudos-42',
  author: 'Alex Morgan',
  recipient: 'Jordan Lee',
  message: 'Thanks for helping with the launch!',
  timestamp: '2025-04-16T10:42:00.000Z',
  reactions: [{ emoji: '👏', count: 2 }],
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)
  global.fetch = fetchMock
})

describe('Board post interactions', () => {
  it('[AC-7] adds one emoji reaction and displays its updated count and selected state', async () => {
    render(<BoardPost {...post} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add 👏 reaction' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos/kudos-42/reactions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ emoji: '👏' }),
    })))
    const selectedReaction = await screen.findByRole('button', { name: '👏 3 reactions, selected' })
    expect(selectedReaction).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Add reaction' })).not.toBeInTheDocument()
  })

  it('[AC-9] immediately removes a successfully hidden kudos and updates active viewers without reload', async () => {
    function BoardHarness() {
      const [visible, setVisible] = useState(true)
      return visible ? <BoardPost {...post} isTeamLead onHidden={() => setVisible(false)} /> : <p>Post removed from board</p>
    }

    const announce = jest.fn()
    window.addEventListener('board:announce', announce)
    render(<><BoardHarness /><BoardPost {...post} id="live-post" /></>)

    fireEvent.click(screen.getByRole('button', { name: 'Hide' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Alex Morgan')
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Jordan Lee')
    fireEvent.click(screen.getByRole('button', { name: 'Hide kudos' }))

    await waitFor(() => expect(screen.getByText('Post removed from board')).toBeInTheDocument())
    expect(screen.getAllByRole('article', { name: 'Kudos for Jordan Lee' })).toHaveLength(1)
    expect(announce).toHaveBeenCalled()

    act(() => window.dispatchEvent(new CustomEvent('kudos:hidden', { detail: { id: 'live-post' } })))
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Kudos for Jordan Lee' })).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Kudos hidden.')
    window.removeEventListener('board:announce', announce)
  })
})
