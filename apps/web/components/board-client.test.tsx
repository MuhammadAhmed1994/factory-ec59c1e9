import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BoardClient } from './board-client'
import type { BoardKudos } from './kudos-composer'

type StreamListener = (event: Event) => void
class MockEventSource {
  static latest: MockEventSource | undefined
  listeners = new Map<string, StreamListener[]>()
  closed = false
  constructor(_url: string, _options?: EventSourceInit) { MockEventSource.latest = this }
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (typeof listener === 'function') this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener as StreamListener])
  }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (typeof listener === 'function') this.listeners.set(type, (this.listeners.get(type) ?? []).filter((item) => item !== listener))
  }
  close() { this.closed = true }
  emit(type: string, data?: unknown) {
    const event = type === 'error' ? new Event('error') : new MessageEvent(type, { data: JSON.stringify(data ?? {}) })
    ;(this.listeners.get(type) ?? []).forEach((listener) => listener(event))
  }
}

const fetchMock = jest.fn<typeof fetch>()
const jsonResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response
const sampleKudos = (id: string, message = `Message ${id}`, createdAt = '2026-06-01T12:00:00.000Z'): BoardKudos => ({
  id,
  authorId: 'author-1',
  recipientId: 'recipient-1',
  message,
  createdAt,
  author: { id: 'author-1', name: 'Alex Morgan' },
  recipient: { id: 'recipient-1', name: 'Jordan Lee' },
})

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock
  MockEventSource.latest = undefined
  Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: MockEventSource })
})

afterEach(() => {
  cleanup()
  jest.restoreAllMocks()
})

describe('live paginated kudos board', () => {
  it('[AC-4] submits a required recipient and message, then displays and clears a successful kudos', async () => {
    const created = sampleKudos('created-1', 'Thanks for helping with the launch!')
    fetchMock.mockImplementation(async (_input, init) => jsonResponse(init?.method === 'POST' ? created : []))
    render(<BoardClient />)
    await screen.findByText('No kudos yet. Start with a thank-you.')

    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))
    expect(await screen.findByText('Choose a recipient before posting.')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Recipient' }), { target: { value: 'recipient-1' } })
    const message = screen.getByRole('textbox', { name: 'Message' })
    fireEvent.change(message, { target: { value: created.message } })
    expect(screen.getByText(`${created.message.length} / 280`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

    const composer = screen.getByRole('region', { name: 'Give someone kudos' })
    expect(await within(composer).findByText('Kudos posted.', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Kudos for Jordan Lee' })).toHaveTextContent(created.message)
    expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveValue('')
    expect(message).toHaveValue('')
    const postRequest = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(postRequest?.[1]?.body as string)).toEqual({ recipientId: 'recipient-1', message: created.message })
  })

  it('[AC-5] displays a newest-first page capped at 20 and browses the next page', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => sampleKudos(`first-${index}`, `Post ${index}`, new Date(2026, 5, 1, 12, 0, -index).toISOString()))
    const secondPage = [sampleKudos('second-1', 'Older page post', '2026-05-30T10:00:00.000Z')]
    fetchMock.mockImplementation(async (input) => String(input).includes('page=2') ? jsonResponse(secondPage) : jsonResponse(firstPage))
    render(<BoardClient />)
    const feed = await screen.findByRole('list', { name: 'Kudos posts, newest first' })
    await waitFor(() => expect(within(feed).getAllByRole('article')).toHaveLength(20))
    expect(within(feed).getAllByText(/^Post /)[0]).toHaveTextContent('Post 0')

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('Older page post')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/kudos?page=2'))).toBe(true)
    expect(within(screen.getByRole('list', { name: 'Kudos posts, newest first' })).getAllByRole('article')).toHaveLength(1)
  })

  it('[AC-6] adds newly posted kudos from the live board stream without reloading', async () => {
    const incoming = sampleKudos('live-1', 'A new live thank-you')
    let call = 0
    fetchMock.mockImplementation(async () => jsonResponse(call++ === 0 ? [] : [incoming]))
    render(<BoardClient />)
    await screen.findByText('No kudos yet. Start with a thank-you.')
    await waitFor(() => expect(MockEventSource.latest).toBeDefined())
    await act(async () => { MockEventSource.latest?.emit('kudos-added', { type: 'added', kudos: { id: incoming.id } }) })
    expect(await screen.findByText(incoming.message)).toBeInTheDocument()
    expect(screen.getByText('New kudos added to the board.')).toBeInTheDocument()
  })

  it('[AC-9] removes a hidden kudos from the already-open board when its removal event arrives', async () => {
    const visible = sampleKudos('still-visible', 'This kudos remains')
    const hidden = sampleKudos('hidden-1', 'This kudos is hidden')
    fetchMock.mockResolvedValue(jsonResponse([visible, hidden]))
    render(<BoardClient />)
    expect(await screen.findByText(hidden.message)).toBeInTheDocument()
    await waitFor(() => expect(MockEventSource.latest).toBeDefined())

    act(() => { MockEventSource.latest?.emit('kudos-removed', { type: 'removed', id: hidden.id }) })
    await waitFor(() => expect(screen.queryByText(hidden.message)).not.toBeInTheDocument())
    expect(screen.getByText(visible.message)).toBeInTheDocument()
    expect(screen.getByText('A hidden kudos was removed from the board.')).toBeInTheDocument()
  })
})
