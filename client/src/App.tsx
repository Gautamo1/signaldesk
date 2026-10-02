import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { ToastProvider } from './components/ui/Toast'
import { CommandPalette } from './features/palette/CommandPalette'
import { CommandCenter } from './pages/CommandCenter'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetail } from './pages/ProjectDetail'
import { InboxPage } from './features/inbox/InboxPage'
import { SourcesPage } from './features/sources/SourcesPage'
import { BriefsPage } from './features/briefs/BriefsPage'
import { BriefEditor } from './features/briefs/BriefEditor'
import { NotFoundPage } from './pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route path="/" element={<CommandCenter />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/briefs" element={<BriefsPage />} />
              <Route path="/briefs/:id" element={<BriefEditor />} />
              <Route path="/sources" element={<SourcesPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          <CommandPalette />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
