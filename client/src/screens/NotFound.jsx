export default function NotFound() {
  return (
    <main className="camera-page camera-not-found">
      <section className="camera-empty">
        <p className="camera-kicker">Not on this roll</p>
        <h1>We couldn’t find that page.</h1>
        <p>That moment may have wandered off. Head back to the camera to keep snapping.</p>
        <a className="btn btn-primary camera-home-link" href={import.meta.env.BASE_URL}>Back to the camera</a>
      </section>
    </main>
  );
}
