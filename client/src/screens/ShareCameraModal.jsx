import { QRCodeSVG } from "qrcode.react";

export default function ShareCameraModal({ eventUrl, onClose, onCopy }) {
  return (
    <div className="camera-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="camera-qr-modal" role="dialog" aria-modal="true" aria-label="Share the event camera" onClick={(event) => event.stopPropagation()}>
        <button className="camera-modal-close" onClick={onClose} aria-label="Close">×</button>
        <p className="camera-kicker">Share the camera</p>
        <h2>Scan to take a few shots</h2>
        <div className="camera-qr-code"><QRCodeSVG value={eventUrl} size={232} level="M" /></div>
        <p>Open your phone camera and scan this code.</p>
        <button className="btn btn-primary" onClick={onCopy}>Copy event link</button>
      </section>
    </div>
  );
}
