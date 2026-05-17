import type { Metadata } from 'next'
import AccountClient from './AccountClient'

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your Inscentives account, orders, and wishlist.',
}

export default function AccountPage() {
  return <AccountClient />
}
