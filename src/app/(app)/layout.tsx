
"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && isClient) {
      router.push('/auth/login');
    }
  }, [user, loading, router, isClient]);

  if (!isClient || loading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-16 md:w-64 border-r p-2">
            <div className="flex items-center gap-2 p-2">
                 <Skeleton className="h-8 w-8 rounded-full" />
                 <Skeleton className="h-6 w-32 hidden md:block" />
            </div>
            <div className="flex flex-col gap-2 mt-8">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
            </div>
        </div>
        <div className="flex-1">
            <header className="h-16 border-b p-4 flex justify-end">
                <Skeleton className="h-8 w-8 rounded-full" />
            </header>
            <main className="p-8">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-64 mt-8" />
            </main>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // or a redirect component, the useEffect will handle redirection
  }
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
            <p>Developed by <a href="http://waseemakram.wuaze.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Waseem Akram</a></p>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
