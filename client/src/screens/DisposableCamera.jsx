import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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

export default function DisposableCamera({ onBack }) {
  const [cameraId] = useState(() => getCameraId());
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("gallery") === "1" ? "gallery" : params.get("my") === "1" ? "myPhotos" : "intro";
  });
  const [guest, setGuest] = useState(() => ({ name: "", email: "", ...getSavedGuestDetails() }));
  const [shotsUsed, setShotsUsed] = useState(0);
  const [shotLimit, setShotLimit] = useState(5);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [activePhotoId, setActivePhotoId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [myPhotos, setMyPhotos] = useState([]);
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

  useEffect(() => {
    let mounted = true;
    const loadGallery = new URLSearchParams(window.location.search).get("gallery") === "1";
    Promise.all([getCameraSession(cameraId), loadGallery ? getCameraPhotos() : Promise.resolve(null)])
      .then(([session, gallery]) => {
        if (!mounted) return;
        setShotsUsed(session.shotsUsed);
        setShotLimit(session.shotLimit);
        if (gallery) {
          setPhotos(gallery.photos);
          setScreen("gallery");
        }
      })
      .catch((err) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [cameraId]);

  useEffect(() => {
    if (screen !== "myPhotos") return;
    getMyCameraPhotos(cameraId)
      .then((result) => setMyPhotos(result.photos))
      .catch((err) => setError(err.message));
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
    setBusy(true);
    setError("");
    try {
      const result = await getMyCameraPhotos(cameraId);
      setMyPhotos(result.photos);
      setScreen("myPhotos");
      const url = new URL(window.location.href);
      url.searchParams.set("my", "1");
      url.searchParams.delete("gallery");
      window.history.replaceState({}, "", url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
    setBusy(true);
    setError("");
    try {
      const result = await getCameraPhotos();
      setPhotos(result.photos);
      setScreen("gallery");
      const url = new URL(window.location.href);
      url.searchParams.set("gallery", "1");
      window.history.replaceState({}, "", url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
      <main className="camera-page camera-gallery-page">
        <div className="camera-topline"><button className="btn-text" onClick={() => setScreen(shotsUsed > 0 ? "camera" : "intro")}>← Your camera</button><span>Your private photo roll</span></div>
        <section className="camera-heading"><p className="camera-kicker">Only visible in this browser</p><h1>My photos</h1><p>{myPhotos.length} saved {myPhotos.length === 1 ? "photo" : "photos"} · {Math.max(shotLimit - shotsUsed, 0)} shots left</p></section>
        {myPhotos.length === 0 ? <p className="camera-empty-note">Your roll is empty so far. Take a photo and it will appear here.</p> : (
          <div className="camera-photo-grid">
            {myPhotos.map((item) => <figure className="camera-gallery-photo" key={item.id}><img src={item.photoUrl} alt="Your photo" /><figcaption><span>{new Date(item.createdAt).toLocaleString()}</span><button className="btn-text camera-delete" onClick={() => removeMyPhoto(item.id)} disabled={busy}>Delete</button></figcaption></figure>)}
          </div>
        )}
        {error && <p className="camera-message">{error}</p>}
      </main>
    );
  }

  if (screen === "gallery") {
    return (
      <main className="camera-page camera-gallery-page">
        <div className="camera-topline"><button className="btn-text" onClick={() => setScreen("intro")}>← Camera</button><span>Matt &amp; Hailey · Guest photos</span></div>
        <section className="camera-heading"><p className="camera-kicker">Guest photo roll</p><h1>Everyone’s point of view</h1><p>{photos.length} guest photos · new photos appear as they’re added</p></section>
        {photos.length === 0 ? <p className="camera-empty-note">No photos yet. Guest photos will appear here as soon as they’re added.</p> : (
          <div className="camera-photo-grid">
            {photos.map((item) => <figure className="camera-gallery-photo" key={item.id}><img src={item.photoUrl} alt={`Photo shared by ${item.name}`} /><figcaption>{item.name}</figcaption></figure>)}
          </div>
        )}
        <button className="btn-text camera-footer-link" onClick={onBack}>Back to camera</button>
      </main>
    );
  }

  return (
    <main className="camera-page">
      <div className="camera-topline"><span>Matt &amp; Hailey · Event camera</span><button className="btn-text" onClick={() => setShowQr(true)}>Share event QR</button></div>
      <section className="camera-brand"><p className="camera-kicker">Matt &amp; Hailey’s wedding</p><h1>Disposable camera</h1><p className="camera-lede">A little roll of the moments only you saw.</p></section>

      {loading ? <p className="camera-status">Loading your camera…</p> : screen === "intro" ? (
        <form className="camera-card camera-form" onSubmit={beginRoll}>
          <div className="camera-roll-badge">{Math.max(shotLimit - shotsUsed, 0)} shots left</div>
          <label>Your name<input value={guest.name} onChange={(event) => setGuest({ ...guest, name: event.target.value })} maxLength={80} autoComplete="name" required /></label>
          <label>Email <span>(optional)</span><input type="email" value={guest.email} onChange={(event) => setGuest({ ...guest, email: event.target.value })} maxLength={254} autoComplete="email" /></label>
          <p className="camera-privacy">Your name appears with your photos. Email is optional and only visible to the hosts. No account needed.</p>
          <button className="btn btn-primary" type="submit" disabled={busy || shotsUsed >= shotLimit}>{shotsUsed >= shotLimit ? "Your roll is full" : busy ? "Opening camera…" : "Get your camera"}</button>
          <p className="camera-limit-note">Your roll is saved on this browser. You can take up to {shotLimit} photos.</p>
        </form>
      ) : (
        <section className="camera-card camera-shoot-card">
          <div className="camera-shoot-header"><div><p className="camera-kicker">{guest.name}</p><h2>Your roll</h2></div><span className="camera-roll-badge">{Math.max(shotLimit - shotsUsed, 0)} left</span></div>
          {photoPreview ? <div className="camera-preview"><img src={photoPreview} alt="Your photo preview" /></div> : cameraUnavailable ? (
            <button className="camera-viewfinder" onClick={() => fileInput.current?.click()} disabled={busy || shotsUsed >= shotLimit}>
              <span className="camera-viewfinder-icon">◎</span><span>Camera unavailable · Choose a photo</span>
            </button>
          ) : <div className="camera-viewfinder camera-live-view"><video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" onLoadedMetadata={() => setCameraReady(true)} />{!cameraReady && <span className="camera-video-hint">Starting camera…</span>}</div>}
          <input ref={fileInput} className="camera-file-input" type="file" accept="image/*" capture="environment" onChange={choosePhoto} />
          {photoPreview ? <div className="camera-action-row"><button className="btn btn-secondary" onClick={() => { setPhoto(null); setPhotoPreview(null); setActivePhotoId(null); }} disabled={busy}>Retake</button><button className="btn btn-primary" onClick={addPhoto} disabled={busy}>{busy ? "Adding to roll…" : "Use this shot"}</button></div> : shotsUsed < shotLimit ? <><button className="camera-shutter" onClick={cameraUnavailable ? () => fileInput.current?.click() : capturePhoto} disabled={busy || (!cameraUnavailable && !cameraReady)} aria-label="Take a photo" /><div className="camera-camera-actions">{!cameraUnavailable && <button className="btn-text" onClick={() => setFacingMode((mode) => mode === "environment" ? "user" : "environment")}>Switch camera</button>}<button className="btn-text" onClick={() => fileInput.current?.click()}>Choose a photo</button></div></> : <p className="camera-limit-note">That’s the whole roll. Thanks for capturing the day.</p>}
          {shotsUsed > 0 && <button className="btn-text camera-gallery-link" onClick={showMyPhotos} disabled={busy}>View or delete my photos</button>}
          {shotsUsed > 0 && <button className="btn-text camera-gallery-link" onClick={showGallery} disabled={busy}>View the public photo roll</button>}
        </section>
      )}
      {error && <p className="camera-message">{error}</p>}
      <div className="camera-bottom-links"><button className="btn-text" onClick={showGallery}>Photo gallery</button><a className="btn-text" href={`${window.location.pathname}?camera-admin=1`}>Host review</a></div>

      {showQr && <div className="camera-modal-backdrop" role="presentation" onClick={() => setShowQr(false)}><section className="camera-qr-modal" role="dialog" aria-modal="true" aria-label="Share the event camera" onClick={(event) => event.stopPropagation()}><button className="camera-modal-close" onClick={() => setShowQr(false)} aria-label="Close">×</button><p className="camera-kicker">Share the camera</p><h2>Scan to take a few shots</h2><div className="camera-qr-code"><QRCodeSVG value={cameraEventUrl()} size={232} level="M" /></div><p>Open your phone camera and scan this code.</p><button className="btn btn-primary" onClick={copyEventLink}>Copy event link</button></section></div>}
    </main>
  );
}
