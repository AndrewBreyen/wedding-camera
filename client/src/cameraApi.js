const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options) {
  if (!API_URL) throw new Error("The camera API is not configured. Set VITE_API_URL and rebuild the app.");
  const response = await fetch(`${API_URL}${path}`, options);
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The camera could not complete that request.");
  return payload;
}

export function getCameraId() {
  const key = "wedding-disposable-camera-id";
  try {
    let cameraId = localStorage.getItem(key);
    if (!cameraId) {
      cameraId = crypto.randomUUID();
      localStorage.setItem(key, cameraId);
    }
    return cameraId;
  } catch {
    return crypto.randomUUID();
  }
}

export function getSavedGuestDetails() {
  try {
    return JSON.parse(localStorage.getItem("wedding-disposable-camera-guest") || "{}");
  } catch {
    return {};
  }
}

export function saveGuestDetails({ name, email }) {
  try {
    localStorage.setItem("wedding-disposable-camera-guest", JSON.stringify({ name, email }));
  } catch {
    // Keeping the name/email in this browser is optional; the API still has the session data.
  }
}

export function createCameraSession({ cameraId, name, email }) {
  return request("/camera/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cameraId, name, email }),
  });
}

export function getCameraSession(cameraId) {
  return request(`/camera/session?cameraId=${encodeURIComponent(cameraId)}`);
}

export function getMyCameraPhotos(cameraId) {
  return request(`/camera/my-photos?cameraId=${encodeURIComponent(cameraId)}`);
}

export function deleteMyCameraPhoto(cameraId, photoId) {
  return request("/camera/my-photos", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cameraId, photoId }),
  });
}

export async function uploadCameraPhoto({ cameraId, photoId, photoBlob }) {
  const { url, shotsUsed, shotLimit } = await request("/camera/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cameraId, photoId }),
  });
  const upload = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: photoBlob,
  });
  if (!upload.ok) throw new Error("The photo did not upload. You can retry this shot.");
  const completed = await request("/camera/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cameraId, photoId }),
  });
  return { shotsUsed: completed.shotsUsed ?? shotsUsed, shotLimit };
}

export function getCameraPhotos() {
  return request("/camera/photos");
}

function adminHeaders(adminCode, extra = {}) {
  return {
    ...extra,
    Authorization: `Bearer ${adminCode}`,
  };
}

export function getAdminCameraPhotos(adminCode) {
  return request("/admin/camera/photos", { headers: adminHeaders(adminCode) });
}

export function deleteCameraPhoto(adminCode, { cameraId, photoId }) {
  return request("/admin/camera/photos", {
    method: "DELETE",
    headers: adminHeaders(adminCode, { "Content-Type": "application/json" }),
    body: JSON.stringify({ cameraId, photoId }),
  });
}

export function cameraEventUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}
