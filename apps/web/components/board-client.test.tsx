import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BoardClient, type BoardKudos } from './board-client'

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>

class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners = new Map<string, EventListener[]>()
  close = jest.fn()

  constructor(_url: string, _options?: EventSourceInit) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const normalized = typeof listener === 'function' ? listener : listener.handleEvent.bind(listener)
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), normalized])
  }

  dispatch(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    for (const listener of this.listeners.get(type) ?? []) listener(event)
  }
}

function kudos(id: string, createdAt: string, message = `Message ${id}`): BoardKudos {
  return { id, authorId: 'member-a', recipientId: 'member-b', message, createdAt }
}

function response(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response
}

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock
  FakeEventSource.instances = []
  Object.defineProperty(window, 'EventSource', { configurable: true, value: FakeEventSource })
})
afterEach(() => jest.clearAllMocks())

describe('Live paginated kudos board', () => {
  it('[AC-4] posts required recipient and message then clears the composer and displays returned kudos', async () => {
    const created = kudos('created-1', '2025-04-16T10:42:00.000Z', 'Thanks for the thoughtful review!')
    fetchMock.mockResolvedValueOnce(response(created))
    render(<BoardClient initialKudos={[]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))
    expect(screen.getByText('Choose a recipient.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole('textbox', { name: 'Recipient' }), { target: { value: 'member-b' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Message/ }), { target: { value: 'x'.repeat(281) } })
    expect(screen.getByRole('textbox', { name: /Message/ })).toHaveValue('x'.repeat(280))
    expect(screen.getByText('280 / 280')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /Message/ }), { target: { value: created.message } })
    expect(screen.getByText(`${created.message.length} / 280`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

    expect(await screen.findByText(created.message, { selector: 'p.post-message' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Recipient' })).toHaveValue(''))
    expect(screen.getAllByText('Kudos posted.').length).toBeGreaterThan(0)
    expect(screen.getByRole('textbox', { name: /Message/ })).toHaveValue('')
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ recipientId: 'member-b', message: created.message }),
    }))
  })

  it('[AC-5] renders at most 20 posts newest first and fetches the next page through accessible controls', async () => {
    const list = Array.from({ length: 20 }, (_, index) => kudos(`post-${index}`, new Date(Date.UTC(2025, 0, 1, 0, index)).toISOString()))
    fetchMock.mockResolvedValueOnce(response([kudos('page-two', '2024-12-31T00:00:00.000Z')]))
    render(<BoardClient initialKudos={list} />)

    const feed = within(screen.getByRole('list', { name: 'Kudos posts, newest first' }))
    expect(feed.getAllByRole('listitem')).toHaveLength(20)
    expect(feed.getAllByRole('listitem')[0]).toHaveTextContent('Message post-19')
    expect(feed.getAllByRole('listitem')[19]).toHaveTextContent('Message post-0')
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos?page=2', expect.anything()))
    expect(await screen.findByText('Message page-two')).toBeInTheDocument()
  })

  it('[AC-6] inserts new kudos delivered by the live board stream without reloading', async () => {
    const existing = kudos('existing', '2025-04-16T09:00:00.000Z')
    const received = kudos('new-live', '2025-04-16T11:00:00.000Z', 'Live thanks from the team')
    fetchMock.mockResolvedValueOnce(response([received, existing]))
    render(<BoardClient initialKudos={[existing]} />)

    act(() => FakeEventSource.instances[0].dispatch('error', {}))
    expect(screen.getByText(existing.message)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Board connection: Reconnecting' })).toBeInTheDocument()
    act(() => FakeEventSource.instances[0].dispatch('kudos-added', { type: 'added', kudos: { id: received.id } }))

    expect(await screen.findByText(received.message)).toBeInTheDocument()
    const feed = within(screen.getByRole('list', { name: 'Kudos posts, newest first' }))
    expect(feed.getAllByRole('listitem')[0]).toHaveTextContent(received.message)
    expect(screen.getByText('New kudos added.')).toBeInTheDocument()
  })

  it('[AC-9] removes hidden kudos from the visible board when a live removal arrives', () => {
    const visible = kudos('visible', '2025-04-16T10:00:00.000Z')
    const hidden = kudos('hidden', '2025-04-16T09:00:00.000Z')
    render(<BoardClient initialKudos={[visible, hidden]} />)

    act(() => FakeEventSource.instances[0].dispatch('kudos-removed', { type: 'removed', id: hidden.id }))

    expect(screen.getByText(visible.message)).toBeInTheDocument()
    expect(screen.queryByText(hidden.message)).not.toBeInTheDocument()
    expect(screen.getByText('A hidden kudos was removed from the board.')).toBeInTheDocument()
  })
})
