import { useEffect, useRef, useState } from "react";
import {
  cameraEventUrl,
  createCameraSession,
  deleteMyCameraPhoto,
  getCameraId,
  getCameraPhotos,
  getCameraSession,
  getMyCameraPhotos,
  getSavedGuestDetails,
  saveGuestDetails,
  uploadCameraPhoto,
} from "../cameraApi";
import CameraIntro from "./CameraIntro.jsx";
import CameraShoot from "./CameraShoot.jsx";
import MyPhotos from "./MyPhotos.jsx";
import PhotoGallery from "./PhotoGallery.jsx";
import ShareCameraModal from "./ShareCameraModal.jsx";

function imageAsJpeg(file) {
  return createImageBitmap(file).then((bitmap) => new Promise((resolve, reject) => {
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare that photo.")), "image/jpeg", 0.86);
  }));
}

function screenFromLocation() {
  const basePath = import.meta.env.BASE_URL;
  const route = window.location.pathname.startsWith(basePath)
    ? window.location.pathname.slice(basePath.length).replace(/^\/+|\/+$/g, "")
    : "";
  if (route === "camera" || route === "gallery" || route === "my-photos") {
    return route === "my-photos" ? "myPhotos" : route;
  }

  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  if (page === "camera" || page === "gallery" || page === "my-photos") return page === "my-photos" ? "myPhotos" : page;
  if (params.get("gallery") === "1") return "gallery";
  if (params.get("my") === "1") return "myPhotos";
  return "intro";
}

export default function DisposableCamera() {
  const [cameraId] = useState(() => getCameraId());
  const [screen, setScreenState] = useState(screenFromLocation);
  const [guest, setGuest] = useState(() => ({ name: "", email: "", ...getSavedGuestDetails() }));
  const [shotsUsed, setShotsUsed] = useState(0);
  const [shotLimit, setShotLimit] = useState(5);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [activePhotoId, setActivePhotoId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [myPhotos, setMyPhotos] = useState([]);
  const [myPhotosLoading, setMyPhotosLoading] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);
  const fileInput = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  function setScreen(nextScreen, { replace = false } = {}) {
    setScreenState(nextScreen);
    const slug = nextScreen === "myPhotos" ? "my-photos" : nextScreen;
    const path = nextScreen === "intro" ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}${slug}`;
    window.history[replace ? "replaceState" : "pushState"]({}, "", path);
  }

  useEffect(() => {
    const handlePopState = () => setScreenState(screenFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let mounted = true;
    getCameraSession(cameraId)
      .then((session) => {
        if (!mounted) return;
        setShotsUsed(session.shotsUsed);
        setShotLimit(session.shotLimit);
      })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [cameraId]);

  useEffect(() => {
    if (screen !== "gallery") return undefined;
    let active = true;
    setGalleryLoading(true);
    getCameraPhotos()
      .then((result) => active && setPhotos(result.photos))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setGalleryLoading(false));
    return () => { active = false; };
  }, [screen]);

  useEffect(() => {
    if (screen !== "myPhotos") return undefined;
    let active = true;
    setMyPhotosLoading(true);
    getMyCameraPhotos(cameraId)
      .then((result) => active && setMyPhotos(result.photos))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setMyPhotosLoading(false));
    return () => { active = false; };
  }, [cameraId, screen]);

  useEffect(() => {
    if (screen !== "camera" || photoPreview || shotsUsed >= shotLimit) return undefined;
    let active = true;
    setCameraReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraUnavailable(true);
      return undefined;
    }
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 1920 } },
    }).then((stream) => {
      if (!active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraUnavailable(false);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }).catch(() => {
      if (active) setCameraUnavailable(true);
    });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [screen, photoPreview, shotsUsed, shotLimit, facingMode]);

  useEffect(() => {
    if (!photoPreview) return undefined;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  async function beginRoll(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await createCameraSession({ cameraId, name: guest.name, email: guest.email });
      saveGuestDetails(guest);
      setShotsUsed(session.shotsUsed);
      setShotLimit(session.shotLimit);
      setScreen("camera");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const jpeg = await imageAsJpeg(file);
      setPhoto(jpeg);
      setActivePhotoId(null);
      setPhotoPreview(URL.createObjectURL(jpeg));
    } catch (err) {
      setError(err.message);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return setError("Could not capture that photo. Please try again.");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setPhoto(blob);
      setActivePhotoId(null);
      setPhotoPreview(URL.createObjectURL(blob));
    }, "image/jpeg", 0.86);
  }

  async function showMyPhotos() {
    setError("");
    setScreen("myPhotos");
  }

  async function removeMyPhoto(photoId) {
    setBusy(true);
    setError("");
    try {
      const result = await deleteMyCameraPhoto(cameraId, photoId);
      setMyPhotos((items) => items.filter((item) => item.id !== photoId));
      setShotsUsed(result.shotsUsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addPhoto() {
    if (!photo) return;
    const photoId = activePhotoId || crypto.randomUUID();
    setActivePhotoId(photoId);
    setBusy(true);
    setError("");
    try {
      const result = await uploadCameraPhoto({ cameraId, photoId, photoBlob: photo });
      setShotsUsed(result.shotsUsed);
      setPhoto(null);
      setActivePhotoId(null);
      setPhotoPreview(null);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("roll is full")) setShotsUsed(shotLimit);
    } finally {
      setBusy(false);
    }
  }

  async function showGallery() {
    setError("");
    setScreen("gallery");
  }

  async function copyEventLink() {
    try {
      await navigator.clipboard.writeText(cameraEventUrl());
      setError("Event link copied.");
    } catch {
      setError("Copy this link to share the camera: " + cameraEventUrl());
    }
  }

  if (screen === "myPhotos") {
    return (
      <MyPhotos
        shotsUsed={shotsUsed}
        shotLimit={shotLimit}
        photos={myPhotos}
        loading={myPhotosLoading}
        busy={busy || myPhotosLoading}
        error={error}
        onBack={() => setScreen(shotsUsed > 0 ? "camera" : "intro")}
        onDelete={removeMyPhoto}
      />
    );
  }

  if (screen === "gallery") {
    return <PhotoGallery photos={photos} loading={galleryLoading} error={error} onBack={() => setScreen("intro")} />;
  }

  return (
    <main className="camera-page">
      <div className="camera-topline"><span>Hailey &amp; Matt · Event camera</span><button className="btn-text" onClick={() => setShowQr(true)}>Share event QR</button></div>
      <section className="camera-brand"><p className="camera-kicker">Disposable camera</p><h1>Hailey &amp; Matt’s wedding</h1><p className="camera-lede">A little roll of the moments only you saw.</p></section>

      {loading ? <p className="camera-status">Loading your camera…</p> : screen === "intro" ? (
        <CameraIntro
          guest={guest}
          onGuestChange={setGuest}
          shotsUsed={shotsUsed}
          shotLimit={shotLimit}
          busy={busy}
          onBegin={beginRoll}
        />
      ) : (
        <CameraShoot
          guestName={guest.name}
          shotsUsed={shotsUsed}
          shotLimit={shotLimit}
          photoPreview={photoPreview}
          cameraUnavailable={cameraUnavailable}
          cameraReady={cameraReady}
          videoRef={videoRef}
          fileInput={fileInput}
          busy={busy}
          onCameraReady={() => setCameraReady(true)}
          onChoosePhoto={choosePhoto}
          onCapturePhoto={capturePhoto}
          onSwitchCamera={() => setFacingMode((mode) => mode === "environment" ? "user" : "environment")}
          onRetake={() => { setPhoto(null); setPhotoPreview(null); setActivePhotoId(null); }}
          onAddPhoto={addPhoto}
          onShowMyPhotos={showMyPhotos}
          onShowGallery={showGallery}
        />
      )}
      {error && <p className="camera-message">{error}</p>}
      <div className="camera-bottom-links"><button className="btn-text" onClick={showGallery}>Photo gallery</button><a className="btn-text" href={`${import.meta.env.BASE_URL}admin`}>Host review</a></div>

      {showQr && <ShareCameraModal eventUrl={cameraEventUrl()} onClose={() => setShowQr(false)} onCopy={copyEventLink} />}
    </main>
  );
}
