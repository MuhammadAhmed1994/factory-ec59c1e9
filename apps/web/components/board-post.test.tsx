import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BoardPost } from './board-post'

const fetchMock = jest.fn()
const originalEventSource = Object.getOwnPropertyDescriptor(globalThis, 'EventSource')

class FakeEventSource {
  static instance: FakeEventSource | null = null
  private readonly listeners = new Map<string, Set<EventListener>>()

  constructor(readonly url: string, readonly options?: EventSourceInit) {
    FakeEventSource.instance = this
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const eventListeners = this.listeners.get(type) ?? new Set<EventListener>()
    eventListeners.add(typeof listener === 'function' ? listener : (event) => listener.handleEvent(event))
    this.listeners.set(type, eventListeners)
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const eventListeners = this.listeners.get(type)
    if (!eventListeners) return
    for (const candidate of eventListeners) {
      if (candidate === listener) eventListeners.delete(candidate)
    }
  }

  close() {}

  emit(type: string, data: string) {
    const event = new MessageEvent(type, { data })
    this.listeners.get(type)?.forEach((listener) => listener(event))
  }
}

beforeEach(() => {
  fetchMock.mockReset()
  FakeEventSource.instance = null
  global.fetch = fetchMock
})

afterEach(() => {
  if (originalEventSource) Object.defineProperty(globalThis, 'EventSource', originalEventSource)
  else Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: undefined })
})

describe('Board post interactions', () => {
  it('[AC-7] adds and displays one emoji reaction with its updated count and pressed state', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ emoji: '👏' }) })
    render(<BoardPost id="kudos-7" author="Alex Morgan" recipient="Jordan Lee" message="Thanks for jumping in." timestamp="2025-04-16T10:42:00Z" reactions={[{ emoji: '👏', count: 2 }]} listenForLiveRemovals={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add 👏 reaction' }))

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '👏 reaction, 3, selected' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: /Add reaction/ })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos/kudos-7/reactions', expect.objectContaining({ method: 'POST', body: JSON.stringify({ emoji: '👏' }) }))
  })

  it('[AC-9] immediately removes a kudos from the board after a lead confirms hiding it for active viewers', async () => {
    Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: FakeEventSource as unknown as typeof EventSource })
    fetchMock.mockImplementation(async () => {
      FakeEventSource.instance?.emit('kudos-removed', JSON.stringify({ type: 'removed', id: 'kudos-9' }))
      return { ok: true, status: 201, json: async () => ({ id: 'kudos-9', isHidden: true }) }
    })
    render(<BoardPost id="kudos-9" author="Alex Morgan" recipient="Jordan Lee" message="A thoughtful thank you." timestamp="2025-04-16T10:42:00Z" teamLead />)
    render(<BoardPost id="kudos-9" author="Alex Morgan" recipient="Jordan Lee" message="A thoughtful thank you." timestamp="2025-04-16T10:42:00Z" />)

    const hideButton = screen.getByRole('button', { name: 'Hide kudos from Alex Morgan to Jordan Lee' })
    fireEvent.click(hideButton)
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Alex Morgan to Jordan Lee')
    fireEvent.click(screen.getByRole('button', { name: 'Hide kudos' }))

    await waitFor(() => expect(screen.queryAllByRole('article', { name: 'Kudos from Alex Morgan to Jordan Lee' })).toHaveLength(0))
    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos/kudos-9/hide', expect.objectContaining({ method: 'POST' }))
    expect(FakeEventSource.instance?.url).toBe('http://localhost:3000/kudos/events')
  })
})
