import { Header } from "./components/layout/Header";
import { InteractiveMap } from "./components/map/InteractiveMap";

function App() {
  return (
    <main className="min-h-screen bg-bg-ocean text-text-primary">
      <Header />
      <InteractiveMap />
    </main>
  );
}

export default App;
