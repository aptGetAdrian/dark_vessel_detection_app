import { useState } from "react";
import { Header } from "./components/layout/Header";
import { InteractiveMap } from "./components/map/InteractiveMap";
import { StatisticsPage } from "./pages/StatisticsPage";
import { ZoneAnalyticsPage } from "./pages/ZoneAnalyticsPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useHealthStatus } from "./hooks/useHealthStatus";

type Page = "dashboard" | "statistics" | "zones";

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const { health, error: healthError } = useHealthStatus();

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-bg-ocean text-text-primary">
        <Header page={page} onNavigate={setPage} health={health} healthError={healthError} />
        {page === "dashboard" ? (
          <InteractiveMap />
        ) : page === "statistics" ? (
          <StatisticsPage />
        ) : (
          <ZoneAnalyticsPage />
        )}
      </main>
    </ErrorBoundary>
  );
}

export default App;
