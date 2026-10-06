import type { Metadata } from 'next'
import BoardClient from '../../components/board-client'

export const metadata: Metadata = {
  title: 'Team kudos — Kudos Board',
}

export default function BoardPage() {
  return <BoardClient />
}
