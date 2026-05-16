import { useState } from "react";
import { Header } from "./components/layout/Header";
import { InteractiveMap } from "./components/map/InteractiveMap";
import { StatisticsPage } from "./pages/StatisticsPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

type Page = "dashboard" | "statistics";

function App() {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-bg-ocean text-text-primary">
        <Header page={page} onNavigate={setPage} />
        {page === "dashboard" ? <InteractiveMap /> : <StatisticsPage />}
      </main>
    </ErrorBoundary>
  );
}

export default App;
