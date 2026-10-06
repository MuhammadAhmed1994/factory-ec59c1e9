import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BoardClient from './board-client'
import { apiRequest } from '../lib/api-client'

jest.mock('../lib/api-client', () => ({ apiRequest: jest.fn() }))

const request = apiRequest as jest.MockedFunction<typeof apiRequest>

type StreamListener = (event: MessageEvent<string>) => void
class TestEventSource {
  static instance: TestEventSource
  listeners = new Map<string, StreamListener>()
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  close = jest.fn()

  constructor(_url: string, _options?: EventSourceInit) {
    TestEventSource.instance = this
    queueMicrotask(() => this.onopen?.())
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.set(type, listener as StreamListener)
  }

  emit(type: string, payload: object) {
    this.listeners.get(type)?.({ data: JSON.stringify(payload) } as MessageEvent<string>)
  }
}

function post(id: string, createdAt: string, message = `message ${id}`) {
  return {
    id,
    authorId: 'author-id',
    recipientId: 'recipient-id',
    message,
    createdAt,
    author: { id: 'author-id', name: 'Alex Morgan' },
    recipient: { id: 'recipient-id', name: 'Jordan Lee' },
    reactions: [],
  }
}

beforeEach(() => {
  request.mockReset()
  ;(globalThis as { EventSource: typeof EventSource }).EventSource = TestEventSource as unknown as typeof EventSource
})

afterEach(() => {
  jest.restoreAllMocks()
})

it('[AC-4] requires a recipient and message and places returned kudos on the board', async () => {
  request.mockImplementation(async (_path, options) => {
    if (options?.method === 'POST') return post('created-1', '2026-06-01T12:00:00.000Z', 'Thanks for your help!') as never
    return [] as never
  })
  render(<BoardClient />)
  await screen.findByText('No kudos yet. Start with a thank-you.')

  fireEvent.change(screen.getByLabelText('Message (280 characters max)'), { target: { value: 'Thanks for your help!' } })
  fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a recipient')
  fireEvent.change(screen.getByLabelText('Recipient'), { target: { value: 'recipient-id' } })
  fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

  expect(await screen.findByText('Thanks for your help!')).toBeInTheDocument()
  expect(screen.getByText('Kudos posted.', { selector: 'p.feedback' })).toBeInTheDocument()
  expect(screen.getByLabelText('Message (280 characters max)')).toHaveValue('')
})

it('[AC-5] orders the visible feed newest first, caps pages at 20, and offers next page navigation', async () => {
  const pageOne = Array.from({ length: 20 }, (_, index) => post(`post-${index}`, new Date(2026, 0, index + 1).toISOString()))
  const pageTwo = [post('post-20', new Date(2026, 0, 0).toISOString())]
  request.mockImplementation(async (path) => {
    if (path === '/kudos?page=1') return pageOne as never
    if (path === '/kudos?page=2') return pageTwo as never
    return [] as never
  })
  render(<BoardClient />)
  const feed = await screen.findByRole('list', { name: 'Kudos posts, newest first' })
  await waitFor(() => expect(within(feed).getAllByRole('article')).toHaveLength(20))
  expect(within(feed).getByText('message post-19')).toBeInTheDocument()
  expect(within(feed).getAllByRole('article')[0]).toHaveTextContent('message post-19')
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  expect(await screen.findByText('message post-20')).toBeInTheDocument()
  expect(request).toHaveBeenCalledWith('/kudos?page=2')
})

it('[AC-6] adds newly posted kudos from the live stream without a reload', async () => {
  const incoming = post('live-1', '2026-06-01T12:30:00.000Z', 'A new live thank-you')
  request.mockImplementation(async (path) => {
    if (path === '/kudos?page=1' && request.mock.calls.filter(([called]) => called === path).length > 1) return [incoming] as never
    return [] as never
  })
  render(<BoardClient />)
  await screen.findByText('No kudos yet. Start with a thank-you.')

  await act(async () => {
    TestEventSource.instance.emit('kudos-added', { type: 'added', kudos: { id: incoming.id } })
  })
  expect(await screen.findByText('A new live thank-you')).toBeInTheDocument()
})

it('[AC-9] removes hidden kudos for viewers already connected to the board', async () => {
  request.mockResolvedValue([post('keep-1', '2026-06-01T12:00:00.000Z', 'Still visible'), post('hide-1', '2026-06-01T11:00:00.000Z', 'Should disappear')] as never)
  render(<BoardClient />)
  expect(await screen.findByText('Should disappear')).toBeInTheDocument()

  await act(async () => {
    TestEventSource.instance.emit('kudos-removed', { type: 'removed', id: 'hide-1' })
  })
  await waitFor(() => expect(screen.queryByText('Should disappear')).not.toBeInTheDocument())
  expect(screen.getByText('Still visible')).toBeInTheDocument()
})
