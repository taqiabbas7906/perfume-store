import AdminAuthGuard from '@/components/admin/AdminAuthGuard'
import AdminLayout from '@/components/admin/AdminLayout'

export const metadata = {
  title: 'Admin · Inscentives',
}

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminAuthGuard>
  )
}
