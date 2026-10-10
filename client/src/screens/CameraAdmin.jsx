import { useCallback, useEffect, useState } from "react";
import { deleteCameraPhoto, getAdminCameraPhotos } from "../cameraApi";

export default function CameraAdmin({ onBack }) {
  const [code, setCode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async (adminCode) => {
    const result = await getAdminCameraPhotos(adminCode);
    setPhotos(result.photos);
    setAuthenticated(true);
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    let active = true;
    const timer = window.setInterval(() => {
      getAdminCameraPhotos(code).then((result) => {
        if (active) {
          setPhotos(result.photos);
        }
      }).catch(() => {});
    }, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [authenticated, code]);

  async function unlock(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await refresh(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(photo) {
    if (!window.confirm(`Permanently delete this photo from ${photo.name}'s roll?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteCameraPhoto(code, { cameraId: photo.cameraId, photoId: photo.id });
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="camera-page camera-admin-page">
      <div className="camera-topline"><button className="btn-text" onClick={onBack}>← Event camera</button><span>Host controls</span></div>
      {!authenticated ? (
        <form className="camera-card camera-form" onSubmit={unlock}>
          <p className="camera-kicker">For the hosts</p><h1>Review the roll</h1>
          <label>Host access code<input type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="current-password" required /></label>
          <p className="camera-privacy">This code is only used to unlock host review on this page.</p>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Checking…" : "Unlock host controls"}</button>
        </form>
      ) : (
        <>
          <section className="camera-admin-heading"><div><p className="camera-kicker">Host review</p><h1>{photos.length} photos on the roll</h1><p>Photos are visible in the guest gallery as soon as each upload completes. Delete any you don’t want shared.</p></div>
          </section>
          {photos.length === 0 ? <p className="camera-empty-note">New photos will show up here for review.</p> : (
            <div className="camera-admin-grid">{photos.map((photo) => <article className="camera-admin-photo" key={photo.id}>
              {photo.photoUrl ? <img src={photo.photoUrl} alt={`Uploaded by ${photo.name}`} /> : <div className="camera-pending-image">Upload in progress</div>}
              <div className="camera-admin-photo-meta"><div><strong>{photo.name}</strong>{photo.email && <a href={`mailto:${photo.email}`}>{photo.email}</a>}<small>{new Date(photo.createdAt).toLocaleString()}</small></div><button className="btn-text camera-delete" onClick={() => remove(photo)} disabled={busy}>Delete</button></div>
            </article>)}</div>
          )}
        </>
      )}
      {error && <p className="camera-message">{error}</p>}
    </main>
  );
}
