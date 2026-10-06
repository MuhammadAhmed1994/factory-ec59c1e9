import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BoardClient } from './board-client'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  listeners = new Map<string, EventListener>()
  closed = false
  constructor(_url: string, _options?: EventSourceInit) { FakeEventSource.instances.push(this) }
  close() { this.closed = true }
  addEventListener(type: string, listener: EventListener) { this.listeners.set(type, listener) }
  emit(data: unknown, eventType = 'message') {
    const event = { data: JSON.stringify(data) } as MessageEvent<string>
    if (eventType === 'message') this.onmessage?.(event)
    this.listeners.get(eventType)?.(event)
  }
}

afterEach(() => {
  jest.restoreAllMocks()
  FakeEventSource.instances = []
  Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: FakeEventSource })
})

function post(id: string, recipient: string, createdAt: string) {
  return { id, authorId: 'author-1', recipientId: recipient, author: 'Alex Morgan', recipient, message: `Message ${id}`, createdAt }
}

function jsonResponse(value: unknown) {
  return { ok: true, status: 200, json: async () => value } as Response
}

function mockFetch() {
  const fetchMock = jest.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
  fetchMock.mockResolvedValue(jsonResponse([]))
  globalThis.fetch = fetchMock
  return fetchMock
}

describe('[AC-4] kudos composer submission', () => {
  it('[AC-4] requires recipient and message, clears after success, and displays returned kudos', async () => {
    Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: FakeEventSource })
    const fetchMock = mockFetch()
    const created = { id: 'k-new', recipientId: 'member-jordan', author: 'Alex Morgan', recipient: 'Jordan Lee', message: 'Thanks for your help!', createdAt: '2026-06-01T12:00:00.000Z' }
    fetchMock.mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse(created))
    render(<BoardClient />)

    const recipient = screen.getByRole('textbox', { name: 'Recipient' })
    const message = screen.getByRole('textbox', { name: 'Message (280 characters max)' })
    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))
    expect(await screen.findByText('Choose a recipient before posting.')).toBeInTheDocument()
    expect(screen.getByText('Write a message before posting.')).toBeInTheDocument()

    fireEvent.change(recipient, { target: { value: 'member-jordan' } })
    fireEvent.change(message, { target: { value: 'Thanks for your help!' } })
    expect(screen.getByText('21 / 280')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

    expect(await screen.findByText('Thanks for your help!')).toBeInTheDocument()
    expect(screen.getByText('Kudos posted.')).toBeInTheDocument()
    expect(recipient).toHaveValue('')
    expect(message).toHaveValue('')
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ recipientId: 'member-jordan', message: 'Thanks for your help!' }),
    }))
  })
})

describe('[AC-5] paginated visible board', () => {
  it('[AC-5] renders no more than 20 posts per page newest first and exposes accessible page controls', async () => {
    Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: FakeEventSource })
    const firstPage = Array.from({ length: 20 }, (_, index) => post(`p-${index}`, `Person ${index}`, new Date(2026, 5, 1, 12, 0, 20 - index).toISOString()))
    const nextPage = [post('newest-next', 'Next recipient', '2026-05-31T12:00:00.000Z'), ...Array.from({ length: 20 }, (_, index) => post(`extra-${index}`, `Extra ${index}`, new Date(2026, 4, 1, 12, 0, index).toISOString()))]
    const fetchMock = mockFetch().mockResolvedValueOnce(jsonResponse(nextPage))
    render(<BoardClient initialKudos={firstPage} />)

    const feed = screen.getByRole('list', { name: 'Kudos posts, newest first' })
    expect(within(feed).getAllByRole('article')).toHaveLength(20)
    expect(within(feed).getAllByRole('article')[0]).toHaveAccessibleName('Kudos from Alex Morgan to Person 0')
    expect(screen.getByRole('navigation', { name: 'Board pagination' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos?page=2', expect.anything()))
    expect(await screen.findByText('Message newest-next')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Kudos posts, newest first' })).getAllByRole('article')).toHaveLength(20)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })
})

describe('[AC-6] live additions', () => {
  it('[AC-6] adds a newly posted kudos from the live stream without reloading', async () => {
    Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: FakeEventSource })
    const fetchMock = mockFetch().mockResolvedValueOnce(jsonResponse([post('existing', 'Jordan Lee', '2026-06-01T11:00:00.000Z'), post('live-new', 'Maya Chen', '2026-06-01T12:00:00.000Z')]))
    render(<BoardClient initialKudos={[post('existing', 'Jordan Lee', '2026-06-01T11:00:00.000Z')]} />)
    const source = FakeEventSource.instances[0]
    act(() => source.onopen?.())
    act(() => source.emit({ type: 'added', kudos: { id: 'live-new' } }, 'kudos-added'))

    expect(await screen.findByText('Message live-new')).toBeInTheDocument()
    expect(screen.getByText('New kudos added.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos?page=1', expect.anything())
  })
})

describe('[AC-9] live removals', () => {
  it('[AC-9] removes hidden kudos from an already open board when the stream reports it', async () => {
    Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: FakeEventSource })
    mockFetch()
    render(<BoardClient initialKudos={[post('visible', 'Jordan Lee', '2026-06-01T12:00:00.000Z'), post('hidden', 'Maya Chen', '2026-06-01T11:00:00.000Z')]} />)
    expect(screen.getByText('Message hidden')).toBeInTheDocument()
    act(() => FakeEventSource.instances[0].emit({ type: 'removed', id: 'hidden' }, 'kudos-removed'))

    await waitFor(() => expect(screen.queryByText('Message hidden')).not.toBeInTheDocument())
    expect(screen.getByText('Message visible')).toBeInTheDocument()
    expect(screen.getByText('A hidden kudos was removed from the board.')).toBeInTheDocument()
  })
})
