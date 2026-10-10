export default function MyPhotos({ shotsUsed, shotLimit, photos, loading, busy, error, onBack, onDelete }) {
  return (
    <main className="camera-page camera-gallery-page">
      <div className="camera-topline"><button className="btn-text" onClick={onBack}>← Your camera</button><span>Your private photo roll</span></div>
      <section className="camera-heading"><p className="camera-kicker">Only visible in this browser</p><h1>My photos</h1><p>{photos.length} saved {photos.length === 1 ? "photo" : "photos"} · {Math.max(shotLimit - shotsUsed, 0)} shots left</p></section>
      {loading ? <p className="camera-empty-note">Loading your photos…</p> : photos.length === 0 ? <p className="camera-empty-note">Your roll is empty so far. Take a photo and it will appear here.</p> : (
        <div className="camera-photo-grid">
          {photos.map((item) => <figure className="camera-gallery-photo" key={item.id}><img src={item.photoUrl} alt="Your photo" /><figcaption><span>{new Date(item.createdAt).toLocaleString()}</span><button className="btn-text camera-delete" onClick={() => onDelete(item.id)} disabled={busy}>Delete</button></figcaption></figure>)}
        </div>
      )}
      {error && <p className="camera-message">{error}</p>}
    </main>
  );
}
