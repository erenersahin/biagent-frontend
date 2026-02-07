import { ReactNode } from 'react'
import Header from './Header'
import { Sidebar, StatusBar } from './layout'

interface LayoutProps {
  children: ReactNode
  /** Hide sidebar for certain pages (e.g., shared view) */
  hideSidebar?: boolean
}

export default function Layout({ children, hideSidebar = false }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-bg-page overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!hideSidebar && <Sidebar />}

        {/* Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {children}
          </div>

          {/* Status Bar */}
          {!hideSidebar && <StatusBar />}
        </main>
      </div>
    </div>
  )
}
