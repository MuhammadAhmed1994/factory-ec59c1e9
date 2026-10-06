import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { SignInForm } from './sign-in-form'

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

const mockedUseRouter = jest.mocked(useRouter)
const originalFetch = global.fetch

describe('[AC-1] successful member sign-in', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ push: jest.fn() } as unknown as ReturnType<typeof useRouter>)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ user: { id: 'member-1', email: 'alex@team.example' } }),
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  it('[AC-1] submits credentials with cookies and navigates to the board after success', async () => {
    const push = jest.fn()
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>)
    render(<SignInForm />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'alex@team.example' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'team-secret' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/board'))
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/auth/sessions',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'alex@team.example', password: 'team-secret' }),
      }),
    )
    expect(screen.getByLabelText('Email address')).toHaveValue('alex@team.example')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })
})
