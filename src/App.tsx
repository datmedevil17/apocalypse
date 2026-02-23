import { Canvas } from "@react-three/fiber";
import { KeyboardControls, type KeyboardControlsEntry, Preload } from "@react-three/drei";
import { Experience } from "./components/Experience";
import "./App.css";
import { useMemo, Suspense } from "react";
import { UI } from "./components/UI";
import { Minimap } from "./components/Minimap";
import { LoadingScreen } from "./components/LoadingScreen";

const Controls = {
  forward: "forward",
  backward: "backward",
  left: "left",
  right: "right",
  jump: "jump",
  sprint: "sprint",
  action1: "action1",
  action2: "action2",
  action3: "action3",
  action4: "action4",
  action5: "action5",
  action6: "action6",
  action7: "action7",
  action8: "action8",
  action9: "action9",
  action0: "action0",
  callPet: "callPet",
  petting: "petting",
} as const;

type ControlKeys = keyof typeof Controls;

function App() {
  const map = useMemo<KeyboardControlsEntry<ControlKeys>[]>(
    () => [
      { name: "forward", keys: ["ArrowUp", "KeyW"] },
      { name: "backward", keys: ["ArrowDown", "KeyS"] },
      { name: "left", keys: ["ArrowLeft", "KeyA"] },
      { name: "right", keys: ["ArrowRight", "KeyD"] },
      { name: "jump", keys: ["Space"] },
      { name: "sprint", keys: ["ShiftLeft", "ShiftRight"] },
      { name: "action1", keys: ["Digit1"] },
      { name: "action2", keys: ["Digit2"] },
      { name: "action3", keys: ["Digit3"] },
      { name: "action4", keys: ["Digit4"] },
      { name: "action5", keys: ["Digit5"] },
      { name: "action6", keys: ["Digit6"] },
      { name: "action7", keys: ["Digit7"] },
      { name: "action8", keys: ["Digit8"] },
      { name: "action9", keys: ["Digit9"] },
      { name: "action0", keys: ["Digit0"] },
      { name: "callPet", keys: ["KeyY"] },
      { name: "petting", keys: ["KeyG"] },
    ],
    []
  );

  return (
    <KeyboardControls map={map}>
      <LoadingScreen />
      <UI />
      <Canvas
        shadows
        camera={{ position: [0, 5, 8], fov: 42 }}
        style={{ width: "100vw", height: "100vh" }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
        <Preload all />
      </Canvas>
      <Minimap />
    </KeyboardControls>
  );
}

export default App;
