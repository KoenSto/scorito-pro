import { useState } from 'react'
import { createElement as h } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

return h(
  'div',
  { className: 'h-screen overflow-hidden bg-background text-slate-100' },
  h(Sidebar, { open: sidebarOpen, onClose: () => setSidebarOpen(false) }),
  h(
    'div',
    { className: 'flex h-screen flex-col md:pl-64' },
    h(Header, { onMenuClick: () => setSidebarOpen(true) }),
    h(
      'main',
      { className: 'flex-1 overflow-y-auto p-4 md:p-8' },
      h('div', { className: 'mx-auto max-w-7xl' }, h(Outlet)),
      ),
    ),
  )
}
