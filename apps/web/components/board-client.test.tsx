import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BoardClient, type BoardKudos } from './board-client'

const sample: BoardKudos = {
  id: 'k-1',
  author: { name: 'Alex Morgan' },
  recipient: { name: 'Jordan Lee' },
  message: 'Thanks for jumping in to help.',
  createdAt: '2025-04-16T10:42:00.000Z',
}

class MockEventSource {
  static latest: MockEventSource
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  listeners: Record<string, (event: Event) => void> = {}
  closed = false
  constructor(_url: string, _options?: EventSourceInit) { MockEventSource.latest = this }
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners[type] = listener as (event: Event) => void
  }
  close() { this.closed = true }
  emit(type: string, data: object) {
    this.listeners[type]?.({ data: JSON.stringify(data) } as MessageEvent<string>)
  }
}

function useMockStream() {
  Object.defineProperty(globalThis, 'EventSource', { configurable: true, writable: true, value: MockEventSource })
}

function mockFetch(payload: unknown) {
  const calls: { input: RequestInfo | URL; init?: RequestInit }[] = []
  const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init })
    return { ok: true, status: 200, json: async () => payload } as Response
  }
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetchMock })
  return calls
}

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(globalThis, 'EventSource')
  Reflect.deleteProperty(globalThis, 'fetch')
})

it('[AC-4] posts required recipient and message and displays returned kudos after clearing the composer', async () => {
  const created = { ...sample, id: 'created-1', message: 'Great collaboration!', recipientId: 'jordan' }
  const calls = mockFetch(created)
  useMockStream()
  render(<BoardClient initialKudos={[]} />)

  fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))
  expect(await screen.findByText('Choose a recipient before posting.')).toBeInTheDocument()
  expect(calls).toHaveLength(0)

  fireEvent.change(screen.getByRole('combobox', { name: 'Recipient' }), { target: { value: 'jordan' } })
  const message = screen.getByRole('textbox', { name: 'Message (280 characters max)' })
  fireEvent.change(message, { target: { value: 'Great collaboration!' } })
  expect(screen.getByText('20 / 280')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

  expect(await screen.findByText('Great collaboration!')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveValue(''))
  expect(message).toHaveValue('')
  expect(calls).toHaveLength(1)
  expect(calls[0].input).toBe('http://localhost:3000/kudos')
  expect(calls[0].init?.method).toBe('POST')
  expect(calls[0].init?.body).toBe(JSON.stringify({ recipientId: 'jordan', message: 'Great collaboration!' }))
})

it('[AC-5] displays no more than twenty kudos newest first and browses an additional page', async () => {
  const firstPage = Array.from({ length: 21 }, (_, index) => ({
    ...sample,
    id: `k-${index}`,
    message: `Message ${index}`,
    createdAt: new Date(Date.parse(sample.createdAt) + index * 1000).toISOString(),
  })).reverse()
  const secondPage = [{ ...sample, id: 'k-21', message: 'Older page item' }]
  const calls = mockFetch(secondPage)
  useMockStream()
  render(<BoardClient initialKudos={firstPage} />)

  expect(screen.getAllByRole('article')).toHaveLength(20)
  expect(screen.getAllByRole('article')[0]).toHaveTextContent('Message 20')
  expect(screen.queryByText('Message 0')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  expect(await screen.findByText('Older page item')).toBeInTheDocument()
  expect(calls[0].input).toBe('http://localhost:3000/kudos?page=2')
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
})

it('[AC-6] adds newly posted kudos from the live stream without reloading', async () => {
  const newKudos = { ...sample, id: 'live-kudos', message: 'A live appreciation update.' }
  const calls = mockFetch([newKudos, sample])
  useMockStream()
  render(<BoardClient initialKudos={[sample]} />)

  await waitFor(() => expect(MockEventSource.latest).toBeDefined())
  await act(async () => {
    MockEventSource.latest.emit('kudos-added', { data: { type: 'added', kudos: { id: 'live-kudos' } } })
  })
  expect(await screen.findByText('A live appreciation update.')).toBeInTheDocument()
  expect(calls[0].input).toBe('http://localhost:3000/kudos?page=1')
  expect(screen.getByText('New kudos added.')).toBeInTheDocument()
})

it('[AC-9] removes a hidden kudos from viewers already connected to the board', async () => {
  useMockStream()
  render(<BoardClient initialKudos={[sample]} />)

  await waitFor(() => expect(MockEventSource.latest).toBeDefined())
  act(() => {
    MockEventSource.latest.emit('kudos-removed', { data: { type: 'removed', id: 'k-1' } })
  })
  await waitFor(() => expect(screen.queryByText(sample.message)).not.toBeInTheDocument())
  expect(screen.getByText('A hidden kudos was removed from the board.')).toBeInTheDocument()
})
