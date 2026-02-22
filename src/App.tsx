import { Canvas } from "@react-three/fiber";
import { KeyboardControls, type KeyboardControlsEntry } from "@react-three/drei";
import { Experience } from "./components/Experience";
import "./App.css";
import { useMemo } from "react";
import { UI } from "./components/UI";

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
    ],
    []
  );

  return (
    <KeyboardControls map={map}>
      <UI />
      <Canvas
        shadows
        camera={{ position: [5, 5, 5], fov: 45 }}
        style={{ width: "100vw", height: "100vh" }}
      >
        <Experience />
      </Canvas>
    </KeyboardControls>
  );
}

export default App;
