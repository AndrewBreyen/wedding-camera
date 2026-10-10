export default function CameraIntro({ guest, onGuestChange, shotsUsed, shotLimit, busy, onBegin }) {
  return (
    <form className="camera-card camera-form" onSubmit={onBegin}>
      <div className="camera-roll-badge">{Math.max(shotLimit - shotsUsed, 0)} shots left</div>
      <label>Your name<input value={guest.name} onChange={(event) => onGuestChange({ ...guest, name: event.target.value })} maxLength={80} autoComplete="name" required /></label>
      <label>Email <span>(optional)</span><input type="email" value={guest.email} onChange={(event) => onGuestChange({ ...guest, email: event.target.value })} maxLength={254} autoComplete="email" /></label>
      <p className="camera-privacy">Your name appears with your photos. Email is optional and only visible to the hosts. No account needed.</p>
      <button className="btn btn-primary" type="submit" disabled={busy || shotsUsed >= shotLimit}>{shotsUsed >= shotLimit ? "Your roll is full" : busy ? "Opening camera…" : "Get your camera"}</button>
      <p className="camera-limit-note">Your roll is saved on this browser. You can take up to {shotLimit} photos.</p>
    </form>
  );
}
