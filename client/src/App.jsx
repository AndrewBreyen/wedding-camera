import DisposableCamera from "./screens/DisposableCamera.jsx";
import CameraAdmin from "./screens/CameraAdmin.jsx";
import NotFound from "./screens/NotFound.jsx";

export default function App() {
  const query = new URLSearchParams(window.location.search);
  const route = window.location.pathname.slice(import.meta.env.BASE_URL.length).replace(/^\/+|\/+$/g, "");
  const legacyAdmin = query.get("camera-admin") === "1" || query.get("page") === "admin";
  const legacyRoute = query.get("page");
  const hasKnownRoute = !route
    || ["admin", "camera", "gallery", "my-photos"].includes(route)
    || legacyAdmin
    || ["camera", "gallery", "my-photos"].includes(legacyRoute);
  const isAdmin = route === "admin" || legacyAdmin;
  const backToCamera = () => window.location.assign(import.meta.env.BASE_URL);

  if (!hasKnownRoute) return <NotFound />;
  if (isAdmin) return <CameraAdmin onBack={backToCamera} />;
  return <DisposableCamera />;
}
