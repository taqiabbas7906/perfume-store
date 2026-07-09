import type { Metadata } from 'next'
import AccountClient from './AccountClient'

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your Minzoshop account, orders, and wishlist.',
}

export default function AccountPage() {
  return <AccountClient />
}
