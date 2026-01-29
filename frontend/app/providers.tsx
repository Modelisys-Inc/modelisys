"use client"

import { AuthProvider } from "@/contexts/auth-context"
import { SidebarProvider } from "@/contexts/sidebar-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </AuthProvider>
  )
}
