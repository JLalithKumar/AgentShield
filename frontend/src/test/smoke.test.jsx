import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('AgentShield frontend', () => {
  it('renders the application heading', () => {
    render(<h1>AgentShield</h1>)

    expect(
      screen.getByRole('heading', { name: 'AgentShield' })
    ).toBeInTheDocument()
  })
})