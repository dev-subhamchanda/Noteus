import { useEffect, useRef, useState } from 'react';
import WebViewer from '@pdftron/pdfjs-express';

export default function PdfExpressViewer({ sourceUrl }: { sourceUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    let dispose: (() => void) | undefined;
    const element = document.createElement('div');
    element.className = 'pdf-express-viewer-host';
    container.appendChild(element);
    setError('');

    WebViewer({
      path: '/pdfjs-express',
      initialDoc: sourceUrl,
      ...(import.meta.env.VITE_PDFJS_EXPRESS_LICENSE_KEY
        ? { licenseKey: import.meta.env.VITE_PDFJS_EXPRESS_LICENSE_KEY }
        : {}),
    }, element)
      .then((instance) => {
        dispose = () => instance.UI.dispose();
        if (!active) dispose();
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to open the PDF viewer.');
      });

    return () => {
      active = false;
      dispose?.();
      element.remove();
    };
  }, [sourceUrl]);

  return (
    <div className="pdf-express-viewer">
      <div ref={containerRef} />
      {error && <p className="pdf-express-viewer-error" role="alert">{error}</p>}
    </div>
  );
}
