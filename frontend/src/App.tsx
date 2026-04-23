import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { CaseListPage } from "./pages/CaseListPage.js";
import { CaseDetailPage } from "./pages/CaseDetailPage.js";
import { UserSwitcher } from "./components/UserSwitcher.js";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } },
});

function Shell() {
  const qc = useQueryClient();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <Link to="/cases" style={{ color: "inherit" }}>
            <h1>Cash Reconciliation Workflow</h1>
          </Link>
          <div className="brand-sub">SEC Rule 204-2 audit-aware demo</div>
        </div>
        <UserSwitcher onChange={() => qc.invalidateQueries()} />
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/cases" replace />} />
          <Route path="/cases" element={<CaseListPage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
