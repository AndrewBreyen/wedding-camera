export default function CameraShoot({
  guestName,
  shotsUsed,
  shotLimit,
  photoPreview,
  cameraUnavailable,
  cameraReady,
  videoRef,
  fileInput,
  busy,
  onCameraReady,
  onChoosePhoto,
  onCapturePhoto,
  onSwitchCamera,
  onRetake,
  onAddPhoto,
  onShowMyPhotos,
  onShowGallery,
}) {
  return (
    <section className="camera-card camera-shoot-card">
      <div className="camera-shoot-header"><div><p className="camera-kicker">{guestName}</p><h2>Your roll</h2></div><span className="camera-roll-badge">{Math.max(shotLimit - shotsUsed, 0)} left</span></div>
      {photoPreview ? <div className="camera-preview"><img src={photoPreview} alt="Your photo preview" /></div> : cameraUnavailable ? (
        <button className="camera-viewfinder" onClick={() => fileInput.current?.click()} disabled={busy || shotsUsed >= shotLimit}>
          <span className="camera-viewfinder-icon">◎</span><span>Camera unavailable · Choose a photo</span>
        </button>
      ) : <div className="camera-viewfinder camera-live-view"><video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" onLoadedMetadata={onCameraReady} />{!cameraReady && <span className="camera-video-hint">Starting camera…</span>}</div>}
      <input ref={fileInput} className="camera-file-input" type="file" accept="image/*" onChange={onChoosePhoto} />
      {photoPreview ? (
        <div className="camera-action-row">
          <button className="btn btn-secondary" onClick={onRetake} disabled={busy}>Retake</button>
          <button className="btn btn-primary" onClick={onAddPhoto} disabled={busy}>{busy ? "Adding to roll…" : "Use this shot"}</button>
        </div>
      ) : shotsUsed < shotLimit ? (
        <>
          <button className="camera-shutter" onClick={cameraUnavailable ? () => fileInput.current?.click() : onCapturePhoto} disabled={busy || (!cameraUnavailable && !cameraReady)} aria-label="Take a photo" />
          <div className="camera-camera-actions">
            {!cameraUnavailable && <button className="btn-text" onClick={onSwitchCamera}>Switch camera</button>}
            <button className="btn-text" onClick={() => fileInput.current?.click()}>Choose a photo</button>
          </div>
        </>
      ) : <p className="camera-limit-note">That’s the whole roll. Thanks for capturing the day.</p>}
      {shotsUsed > 0 && <button className="btn-text camera-gallery-link" onClick={onShowMyPhotos} disabled={busy}>View or delete my photos</button>}
      {shotsUsed > 0 && <button className="btn-text camera-gallery-link" onClick={onShowGallery} disabled={busy}>View the public photo roll</button>}
    </section>
  );
}
