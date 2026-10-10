import DisposableCamera from "./screens/DisposableCamera.jsx";
import CameraAdmin from "./screens/CameraAdmin.jsx";

export default function App() {
  const isAdmin = new URLSearchParams(window.location.search).get("camera-admin") === "1";
  const backToCamera = () => window.location.assign(window.location.pathname);

  return isAdmin
    ? <CameraAdmin onBack={backToCamera} />
    : <DisposableCamera onBack={backToCamera} />;
}
