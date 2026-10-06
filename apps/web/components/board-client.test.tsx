import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BoardClient, type BoardPageData } from './board-client'

const fetchMock = jest.fn()

class FakeEventSource {
  static instance: FakeEventSource | null = null
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  private listeners = new Map<string, Set<EventListener>>()

  constructor(readonly url: string) { FakeEventSource.instance = this }
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const set = this.listeners.get(type) ?? new Set<EventListener>()
    set.add(typeof listener === 'function' ? listener : (event) => listener.handleEvent(event))
    this.listeners.set(type, set)
  }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.get(type)?.forEach((candidate) => { if (candidate === listener) this.listeners.get(type)?.delete(candidate) })
  }
  close() {}
  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    this.listeners.get(type)?.forEach((listener) => listener(event))
  }
}

const originalEventSource = Object.getOwnPropertyDescriptor(globalThis, 'EventSource')
const item = (id: string, createdAt: string, message = id) => ({
  id,
  authorId: 'author-1',
  recipientId: 'recipient-1',
  message,
  createdAt,
  isHidden: false,
})

function page(kudos: ReturnType<typeof item>[], pageNumber = 1): BoardPageData {
  return { kudos, page: pageNumber, pageSize: 20 }
}

beforeEach(() => {
  fetchMock.mockReset()
  FakeEventSource.instance = null
  global.fetch = fetchMock
  Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: FakeEventSource as unknown as typeof EventSource })
})

afterEach(() => {
  if (originalEventSource) Object.defineProperty(globalThis, 'EventSource', originalEventSource)
  else Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: undefined })
})

test('[AC-4] submits required recipient and message, clears the composer, and shows returned kudos', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ ...item('new-kudos', '2025-04-18T12:00:00Z', 'Thanks for your help!'), authorId: 'Alex Morgan', recipientId: 'Jordan Lee' }) })
  render(<BoardClient initialPage={page([])} />)

  fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))
  expect(screen.getByText('Choose a recipient before posting.')).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox', { name: 'Recipient' }), { target: { value: 'Jordan Lee' } })
  fireEvent.change(screen.getByRole('textbox', { name: /Message/ }), { target: { value: 'Thanks for your help!' } })
  expect(screen.getByText('21 / 280')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

  expect(await screen.findByText('Thanks for your help!')).toBeInTheDocument()
  await waitFor(() => {
    expect(screen.getByRole('textbox', { name: 'Recipient' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: /Message/ })).toHaveValue('')
  })
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos', expect.objectContaining({ method: 'POST', body: JSON.stringify({ recipientId: 'Jordan Lee', message: 'Thanks for your help!' }) }))
})

test('[AC-5] renders newest-first pages capped at 20 and offers accessible pagination', async () => {
  const newest = item('newer', '2025-04-18T12:00:00Z', 'Newest message')
  const older = item('older', '2025-04-17T12:00:00Z', 'Older message')
  const firstPage = page(Array.from({ length: 20 }, (_, index) => index === 0 ? older : item(`post-${index}`, `2025-04-${String(16 - index).padStart(2, '0')}T12:00:00Z`)))
  const secondPage = page([newest], 2)
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => secondPage })
  render(<BoardClient initialPage={firstPage} />)

  const feed = screen.getByRole('list', { name: 'Kudos posts, newest first' })
  expect(within(feed).getAllByRole('listitem')).toHaveLength(20)
  expect(within(feed).getAllByRole('article')[0]).toHaveTextContent('Older message')
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

  expect(await screen.findByText('Newest message')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/kudos?page=2', expect.any(Object))
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
})

test('[AC-6] adds incoming kudos to the visible board from the live event stream', async () => {
  const latest = item('live-post', '2025-04-18T12:00:00Z', 'Arrived while you were here')
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => page([latest]) })
  render(<BoardClient initialPage={page([])} />)

  expect(FakeEventSource.instance?.url).toBe('http://localhost:3000/kudos/events')
  await act(async () => {
    FakeEventSource.instance?.emit('kudos-added', { type: 'added', kudos: { id: 'live-post' } })
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(await screen.findByText('Arrived while you were here')).toBeInTheDocument()
})

test('[AC-9] removes hidden kudos for viewers already connected to the board', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => page([]) })
  render(<BoardClient initialPage={page([item('to-hide', '2025-04-18T12:00:00Z', 'This should disappear')])} />)

  expect(screen.getByText('This should disappear')).toBeInTheDocument()
  await act(async () => {
    FakeEventSource.instance?.emit('kudos-removed', { type: 'removed', id: 'to-hide' })
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await waitFor(() => expect(screen.queryByText('This should disappear')).not.toBeInTheDocument())
  expect(screen.getByText('A hidden kudos was removed from the board.')).toBeInTheDocument()
})
