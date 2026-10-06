import type { ComponentType } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
let SignInForm: ComponentType
let useRouter: typeof import('next/navigation').useRouter

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

beforeAll(async () => {
  ;({ useRouter } = await import('next/navigation'))
  ;({ SignInForm } = await import('./sign-in-form'))
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.mocked(useRouter).mockReset()
  mockPush.mockReset()
  Reflect.deleteProperty(global, 'fetch')
})

describe('sign-in form', () => {
  it('[AC-1] submits credentials, establishes the cookie-backed session, and navigates to /board', async () => {
    jest.mocked(useRouter).mockReturnValue({ push: mockPush } as ReturnType<typeof useRouter>)
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
      headers: { get: () => 'session=authenticated-session; HttpOnly; Secure; SameSite=Lax' },
    })
    Object.defineProperty(global, 'fetch', { configurable: true, writable: true, value: fetchMock })

    render(<SignInForm />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'alex@team.example' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'team-password' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/board'))
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/sessions$/),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'alex@team.example', password: 'team-password' }),
      }),
    )
    expect(await screen.findByText("You're signed in. Opening the kudos board…")).toHaveAttribute('role', 'status')
    expect(screen.getByLabelText('Email address')).toHaveValue('alex@team.example')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })
})
