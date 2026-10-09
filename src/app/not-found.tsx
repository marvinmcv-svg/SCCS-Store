import Link from 'next/link';
import './globals.css';

/** Fallback for requests outside the [locale] segment. */
export default function GlobalNotFound() {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, letterSpacing: '.08em', color: '#5c5c6b' }}>404</p>
          <h1 style={{ fontWeight: 500, letterSpacing: '-.03em' }}>Página no encontrada</h1>
          <Link href="/" style={{ color: '#292963' }}>
            Ir al inicio
          </Link>
        </div>
      </body>
    </html>
  );
}
