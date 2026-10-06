import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SignInFormContent } from './sign-in-form'

const mockPush = jest.fn<(path: string) => void>()
const originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch')

describe('SignInForm', () => {
  afterEach(() => {
    if (originalFetchDescriptor) {
      Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'fetch')
    }
    mockPush.mockReset()
  })

  it('[AC-1] submits credentials, establishes signed-in state, and navigates to /board', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        user: { id: 'member-1', email: 'alex@team.example', name: 'Alex', role: 'MEMBER' },
      }),
    } as Response)
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    })

    render(<SignInFormContent navigateToBoard={mockPush} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'alex@team.example' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'team-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent("You're signed in. Opening the kudos board…"),
    )
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/board'))
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/auth/sessions',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'alex@team.example', password: 'team-secret' }),
      }),
    )
  })
})
