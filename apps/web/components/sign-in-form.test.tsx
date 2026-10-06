import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockPush = jest.fn()

jest.doMock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))
const SignInForm = require('./sign-in-form').default as typeof import('./sign-in-form').default

describe('sign-in form', () => {
  it('[AC-1] submits credentials, establishes signed-in state, and navigates to the board', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ user: { id: 'member-1', email: 'alex@team.example', name: 'Alex', role: 'member' } }),
    } as Response)
    global.fetch = fetchMock

    render(<SignInForm />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'alex@team.example' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/board'))
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/auth/sessions',
      expect.objectContaining({ method: 'POST', credentials: 'include', body: expect.any(String) }),
    )
    const submittedBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(submittedBody).toEqual({ email: 'alex@team.example', password: expect.any(String) })
    expect(await screen.findByRole('status')).toHaveTextContent("You're signed in. Opening the kudos board…")
  })
})
