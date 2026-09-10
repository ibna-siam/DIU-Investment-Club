'use client';

import React, { useState } from 'react';
import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../hooks/useAuth';
import { AgentationToolbar } from '../components/AgentationToolbar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <html lang="en" className="dark h-full">
      <head>
        <title>DIU Investment Club - Financial Management System</title>
        <meta
          name="description"
          content="Centralized financial and accounting management platform for DIU Investment Club."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://invesment.top" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://invesment.top" />
        <meta property="og:title" content="DIU Investment Club - Financial Management System" />
        <meta
          property="og:description"
          content="Centralized financial and accounting management platform for DIU Investment Club."
        />
        <meta property="og:site_name" content="DIU Investment Club" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="DIU Investment Club - Financial Management System" />
        <meta
          name="twitter:description"
          content="Centralized financial and accounting management platform for DIU Investment Club."
        />
      </head>
      <body className="h-full bg-slate-950 text-slate-100 antialiased font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
          <AgentationToolbar />
        </QueryClientProvider>
      </body>
    </html>
  );
}
