import "./index.css";
import { ZombieGame } from "./components/ZombieGame";
import { ToastProvider } from "./components/Toast";

export function App() {
  return (
    <ToastProvider>
      <ZombieGame />
    </ToastProvider>
  );
}

export default App;
