import { Header } from "./components/layout/Header";

function App() {
  return (
    <main className="min-h-screen bg-bg-ocean text-text-primary">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Dark Vessels
        </h1>
      </div>
    </main>
  );
}

export default App;
