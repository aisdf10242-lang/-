import { Route, Routes } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { Dashboard } from "./pages/Dashboard";
import { PairDetail } from "./pages/PairDetail";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <>
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pair/:pair" element={<PairDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
}

export default App;
