import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BoardClient } from './board-client'
import type { BoardKudos } from './kudos-composer'

const originalEventSource = global.EventSource
const originalFetch = global.fetch
let fetchMock: jest.Mock

class MockEventSource {
  static instances: MockEventSource[] = []
  readonly listeners = new Map<string, EventListener[]>()
  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  closed = false

  constructor(_url: string, _options?: EventSourceInit) {
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: EventListener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  removeEventListener() {}
  close() { this.closed = true }

  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    this.listeners.get(type)?.forEach((listener) => listener(event))
  }
}

function makeKudos(id: string, createdAt: string, message = `Message ${id}`): BoardKudos {
  return {
    id,
    authorId: 'author-1',
    recipientId: 'recipient-1',
    message,
    createdAt,
    author: { id: 'author-1', name: `Author ${id}` },
    recipient: { id: 'recipient-1', name: `Recipient ${id}` },
    reactions: [],
  }
}

function response(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response
}

function addEventSourceMock() {
  MockEventSource.instances = []
  global.EventSource = MockEventSource as unknown as typeof EventSource
}

function boardStream() {
  return MockEventSource.instances.find((source) => source.listeners.has('kudos-added') || source.listeners.has('kudos-removed'))
}

beforeEach(() => {
  fetchMock = jest.fn()
  global.fetch = fetchMock as unknown as typeof fetch
  addEventSourceMock()
})

afterEach(() => {
  global.EventSource = originalEventSource
  global.fetch = originalFetch
  jest.clearAllMocks()
})

describe('live paginated kudos board', () => {
  it('[AC-4] posts a required recipient and message, clears the form, and displays returned kudos', async () => {
    const created = makeKudos('new-1', '2025-04-16T10:42:00.000Z', 'Thanks for helping with the launch!')
    fetchMock.mockImplementation(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'POST') return response(created)
      return response([])
    })

    render(<BoardClient />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Recipient' }), { target: { value: 'recipient-1' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: created.message } })
    expect(screen.getByText(`${created.message.length} / 280`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

    expect(await screen.findByText(created.message)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveValue('')
      expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('')
    })
    expect(screen.getByText('Kudos posted. Your appreciation is on the board.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ recipientId: 'recipient-1', message: created.message }),
    }))
  })

  it('[AC-5] shows at most 20 newest kudos and loads another page with accessible navigation', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => makeKudos(
      `k-${index}`,
      new Date(Date.UTC(2025, 3, 16, 10, 42 - index)).toISOString(),
    ))
    const secondPage = [makeKudos('k-20', '2025-04-16T10:22:00.000Z')]
    fetchMock.mockImplementation(async (url: RequestInfo | URL) => {
      return response(String(url).includes('/kudos?page=2') ? secondPage : firstPage)
    })

    render(<BoardClient />)
    const feed = await screen.findByRole('list', { name: 'Kudos posts, newest first' })
    await waitFor(() => expect(feed.querySelectorAll('li')).toHaveLength(20))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled())
    expect(feed.querySelectorAll('li')[0]).toHaveTextContent('Author k-0')
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByText('Message k-20')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos?page=2', expect.anything())
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('[AC-6] adds incoming kudos to the live board without reloading the page', async () => {
    const existing = makeKudos('existing', '2025-04-16T10:00:00.000Z')
    const incoming = makeKudos('incoming', '2025-04-16T10:42:00.000Z', 'A new live thank-you')
    fetchMock.mockResolvedValueOnce(response([existing])).mockResolvedValueOnce(response([incoming, existing]))

    render(<BoardClient />)
    expect(await screen.findByText(existing.message)).toBeInTheDocument()
    await waitFor(() => expect(boardStream()).toBeDefined())
    await act(async () => {
      boardStream()?.emit('kudos-added', { type: 'added', kudos: { id: incoming.id } })
      await Promise.resolve()
    })

    expect(await screen.findByText(incoming.message)).toBeInTheDocument()
    expect(screen.getByText('New kudos added to the board.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('[AC-9] removes a hidden kudos from a board already open in a viewer', async () => {
    const visible = makeKudos('to-hide', '2025-04-16T10:00:00.000Z', 'This post will be hidden')
    fetchMock.mockResolvedValueOnce(response([visible])).mockResolvedValueOnce(response([]))

    render(<BoardClient />)
    expect(await screen.findByText(visible.message)).toBeInTheDocument()
    await waitFor(() => expect(boardStream()).toBeDefined())
    await act(async () => {
      boardStream()?.emit('kudos-removed', { type: 'removed', id: visible.id })
      await Promise.resolve()
    })

    await waitFor(() => expect(screen.queryByText(visible.message)).not.toBeInTheDocument())
    expect(screen.getByText('Hidden kudos removed from the board.')).toBeInTheDocument()
    expect(screen.getByText('No kudos yet. Start with a thank-you.')).toBeInTheDocument()
  })
})
