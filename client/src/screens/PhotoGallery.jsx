export default function PhotoGallery({ photos, loading, error, onBack }) {
  return (
    <main className="camera-page camera-gallery-page">
      <div className="camera-topline"><button className="btn-text" onClick={onBack}>← Camera</button><span>Hailey &amp; Matt · Guest photos</span></div>
      <section className="camera-heading"><p className="camera-kicker">Guest photo roll</p><h1>Everyone’s point of view</h1><p>{photos.length} guest photos · refresh to see new photos</p></section>
      {loading ? <p className="camera-empty-note">Loading photos…</p> : photos.length === 0 ? <p className="camera-empty-note">No photos yet. Guest photos will appear here as soon as they’re added.</p> : (
        <div className="camera-photo-grid">
          {photos.map((item) => (
            <figure className="camera-gallery-photo" key={item.id}>
              <img src={item.photoUrl} alt={`Photo shared by ${item.name}`} />
              <figcaption>
                {item.name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {error && <p className="camera-message">{error}</p>}
      <button className="btn-text camera-footer-link" onClick={onBack}>Back to camera</button>
    </main>
  );
}
