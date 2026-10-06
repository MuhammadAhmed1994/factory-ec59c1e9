import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BoardClient } from './board-client'
import { apiRequest } from '@/lib/api-client'

jest.mock('@/lib/api-client', () => ({ apiRequest: jest.fn() }))

const requestMock = apiRequest as jest.MockedFunction<typeof apiRequest>

class MockEventSource {
  static instance: MockEventSource
  listeners: Record<string, EventListener> = {}
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(_url: string, _options?: EventSourceInit) { MockEventSource.instance = this }
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners[type] = listener as EventListener
  }
  close() {}
  emit(type: string, data: unknown) {
    this.listeners[type]?.(new MessageEvent(type, { data: JSON.stringify(data) }))
  }
}

function post(id: string, createdAt: string, message = `Message ${id}`) {
  return {
    id,
    authorId: 'member-a',
    recipientId: 'member-b',
    author: { id: 'member-a', name: 'Alex Morgan' },
    recipient: { id: 'member-b', name: 'Jordan Lee' },
    message,
    createdAt,
    isHidden: false,
  }
}

beforeEach(() => {
  requestMock.mockReset()
  Object.defineProperty(window, 'EventSource', { configurable: true, writable: true, value: MockEventSource })
})

afterEach(() => jest.restoreAllMocks())

describe('live paginated board', () => {
  it('[AC-4] submits required recipient and message and displays the returned kudos after clearing the composer', async () => {
    const created = post('new-kudos', '2026-06-01T12:00:00.000Z', 'Thank you for the thoughtful review.')
    requestMock.mockResolvedValueOnce([]).mockResolvedValueOnce(created)
    render(<BoardClient />)

    await waitFor(() => expect(requestMock).toHaveBeenCalledWith('/kudos?page=1'))
    fireEvent.change(screen.getByRole('combobox', { name: 'Recipient' }), { target: { value: 'member-b' } })
    const message = screen.getByRole('textbox', { name: /Message/ })
    fireEvent.change(message, { target: { value: created.message } })
    expect(screen.getByText(`${created.message.length} / 280`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

    expect(await screen.findByText(created.message)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: /Message/ })).toHaveValue('')
    expect(requestMock).toHaveBeenLastCalledWith('/kudos', {
      method: 'POST',
      body: JSON.stringify({ recipientId: 'member-b', message: created.message }),
    })
    expect(screen.getByText('Kudos posted.')).toBeInTheDocument()
  })

  it('[AC-5] shows newest-first pages capped at twenty and lets viewers browse another page', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => post(`post-${String(index).padStart(2, '0')}`, new Date(2026, 0, 20 - index).toISOString()))
    requestMock.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([post('older-page-post', '2025-01-01T00:00:00.000Z')])
    render(<BoardClient />)

    const feed = await screen.findByRole('list', { name: 'Kudos posts, newest first' })
    expect(within(feed).getAllByRole('listitem')).toHaveLength(20)
    const firstMessage = within(feed).getByText('Message post-00')
    const secondMessage = within(feed).getByText('Message post-01')
    expect(firstMessage.compareDocumentPosition(secondMessage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('Message older-page-post')).toBeInTheDocument()
    expect(requestMock).toHaveBeenLastCalledWith('/kudos?page=2')
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('[AC-6] inserts newly posted kudos from the live stream without a page reload', async () => {
    const initial = post('existing', '2026-01-01T00:00:00.000Z')
    const live = post('live-one', '2026-06-01T12:00:00.000Z', 'A teammate just posted this.')
    requestMock.mockResolvedValueOnce([initial]).mockResolvedValueOnce([live, initial])
    render(<BoardClient />)

    expect(await screen.findByText(initial.message)).toBeInTheDocument()
    act(() => MockEventSource.instance.emit('kudos-added', { data: { type: 'added', kudos: { id: live.id } } }))

    expect(await screen.findByText(live.message)).toBeInTheDocument()
    expect(screen.getByText(initial.message)).toBeInTheDocument()
    expect(screen.getByText('New kudos added.')).toBeInTheDocument()
  })

  it('[AC-9] removes a hidden kudos from the board for viewers already connected', async () => {
    const visible = post('visible-post', '2026-01-01T00:00:00.000Z')
    requestMock.mockResolvedValueOnce([visible])
    render(<BoardClient />)

    expect(await screen.findByText(visible.message)).toBeInTheDocument()
    act(() => MockEventSource.instance.emit('kudos-removed', { data: { type: 'removed', id: visible.id } }))

    await waitFor(() => expect(screen.queryByText(visible.message)).not.toBeInTheDocument())
    expect(screen.getByText('A hidden kudos was removed from the board.')).toBeInTheDocument()
  })
})
