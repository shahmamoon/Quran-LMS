import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Minimize, RotateCcw, Highlighter } from 'lucide-react';

interface Props {
  pageNumber: number | null;
  totalPages?: number;
  onClose: () => void;
  onNavigate?: (page: number) => void;
  allowHighlight?: boolean;   // teacher mode — enables row highlighting
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

// Height of the highlight band as a fraction of the image natural height.
// Quran pages have ~15 text lines; measured ~0.055 per line.
const HIGHLIGHT_HEIGHT_FRAC = 0.055;

export default function QuranPageModal({ pageNumber, totalPages = 604, onClose, onNavigate, allowHighlight }: Props) {
  const [loaded, setLoaded]             = useState(false);
  const [error, setError]               = useState(false);
  const [zoom, setZoom]                 = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging]     = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  // Stored as fraction of image height (0–1) so it's zoom-independent
  const [highlightYFrac, setHighlightYFrac] = useState<number | null>(null);

  const backdropRef   = useRef<HTMLDivElement>(null);
  const panelRef      = useRef<HTMLDivElement>(null);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const imgRef        = useRef<HTMLImageElement>(null);
  const imgWrapRef    = useRef<HTMLDivElement>(null);
  const lastPos       = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const draggingRef   = useRef(false);

  // Reset on page change
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setZoom(1);
    setHighlightYFrac(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pageNumber]);

  // Turn off highlight mode when allowHighlight is removed
  useEffect(() => { if (!allowHighlight) setHighlightMode(false); }, [allowHighlight]);

  const applyZoom = useCallback((next: number) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft'  && onNavigate && pageNumber && pageNumber > 1)          onNavigate(pageNumber - 1);
      if (e.key === 'ArrowRight' && onNavigate && pageNumber && pageNumber < totalPages)  onNavigate(pageNumber + 1);
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey) applyZoom(zoom + ZOOM_STEP);
      if (e.key === '-' && !e.ctrlKey)                     applyZoom(zoom - ZOOM_STEP);
      if (e.key === '0') setZoom(1);
      if (e.key === 'h' && allowHighlight) setHighlightMode(m => !m);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageNumber, totalPages, onClose, onNavigate, zoom, applyZoom, allowHighlight]);

  // Ctrl+scroll = zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoom, applyZoom]);

  // Click on image in highlight mode → center the band on the clicked Y
  function onImageClick(e: React.MouseEvent) {
    if (!highlightMode || !imgRef.current || !imgWrapRef.current) return;
    e.stopPropagation();
    const imgRect = imgRef.current.getBoundingClientRect();
    const clickY  = e.clientY - imgRect.top;
    // Center band on click point, clamped so it doesn't overflow top/bottom
    const frac = Math.max(0, Math.min(1 - HIGHLIGHT_HEIGHT_FRAC, clickY / imgRect.height - HIGHLIGHT_HEIGHT_FRAC / 2));
    setHighlightYFrac(frac);
  }

  // Touch tap in highlight mode
  function onImageTouchEnd(e: React.TouchEvent) {
    if (!highlightMode || !imgRef.current || lastPinchDist.current !== null) return;
    if (e.changedTouches.length !== 1) return;
    const imgRect = imgRef.current.getBoundingClientRect();
    const touchY  = e.changedTouches[0].clientY - imgRect.top;
    const frac = Math.max(0, Math.min(1 - HIGHLIGHT_HEIGHT_FRAC, touchY / imgRect.height - HIGHLIGHT_HEIGHT_FRAC / 2));
    setHighlightYFrac(frac);
  }

  // Pan drag (only when zoomed and NOT in highlight mode)
  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1 || highlightMode) return;
    draggingRef.current = true;
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!draggingRef.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft -= e.clientX - lastPos.current.x;
    scrollRef.current.scrollTop  -= e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseUp() { draggingRef.current = false; setIsDragging(false); }

  // Touch pinch + drag
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      lastPinchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    } else if (e.touches.length === 1 && zoom > 1 && !highlightMode) {
      draggingRef.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      applyZoom(zoom * (dist / lastPinchDist.current));
      lastPinchDist.current = dist;
    } else if (e.touches.length === 1 && draggingRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft -= e.touches[0].clientX - lastPos.current.x;
      scrollRef.current.scrollTop  -= e.touches[0].clientY - lastPos.current.y;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }
  function onTouchEnd() { draggingRef.current = false; lastPinchDist.current = null; }

  // Fullscreen
  function toggleFullscreen() {
    if (!document.fullscreenElement) backdropRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (pageNumber === null) return null;

  const src     = `/quran-pages/${String(pageNumber).padStart(3, '0')}.png`;
  const canPrev = !!onNavigate && pageNumber > 1;
  const canNext = !!onNavigate && pageNumber < totalPages;

  // Cursor: crosshair in highlight mode, grab when panning, default otherwise
  const cursor = highlightMode ? 'crosshair' : zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>

      <div
        ref={panelRef}
        className={`flex flex-col bg-white shadow-2xl overflow-hidden transition-all ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-3xl rounded-2xl'
        }`}
        style={isFullscreen ? {} : { maxHeight: 'calc(100vh - 2rem)' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => canPrev && onNavigate!(pageNumber - 1)} disabled={!canPrev}
              title="Previous page (←)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-slate-600 text-sm font-medium">
              Page <span className="text-slate-900 font-bold">{pageNumber}</span>
              <span className="text-slate-400 font-normal"> / {totalPages}</span>
            </span>
            <button onClick={() => canNext && onNavigate!(pageNumber + 1)} disabled={!canNext}
              title="Next page (→)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Highlight toggle — teacher only */}
            {allowHighlight && (
              <>
                <button
                  onClick={() => setHighlightMode(m => !m)}
                  title={highlightMode ? 'Click to exit highlight mode (H)' : 'Highlight a row (H)'}
                  className={`p-1.5 rounded transition-colors ${
                    highlightMode
                      ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <Highlighter size={16} />
                </button>
                {highlightYFrac !== null && !highlightMode && (
                  <button
                    onClick={() => setHighlightYFrac(null)}
                    title="Clear highlight"
                    className="text-xs text-slate-400 hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <div className="w-px h-5 bg-slate-200 mx-1" />
              </>
            )}

            <button onClick={() => applyZoom(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}
              title="Zoom out (−)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ZoomOut size={16} />
            </button>
            <button onClick={() => setZoom(1)} title="Reset zoom (0)"
              className="min-w-[3.2rem] text-center text-xs font-mono text-slate-500 hover:text-slate-800 px-1.5 py-1.5 rounded hover:bg-slate-200 transition-colors">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => applyZoom(zoom + ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}
              title="Zoom in (+)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ZoomIn size={16} />
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <button onClick={() => { setZoom(1); setHighlightYFrac(null); if (scrollRef.current) scrollRef.current.scrollTop = 0; }}
              title="Reset view"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">
              <RotateCcw size={15} />
            </button>
            <button onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <button onClick={onClose} title="Close (Esc)"
              className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Scrollable image area ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto bg-slate-100 min-h-0"
          style={{ cursor }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {!loaded && !error && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center gap-2 h-full min-h-[400px] text-slate-400 text-sm">
              <span className="text-3xl">📄</span>
              Page image not found
            </div>
          ) : (
            <div ref={imgWrapRef} className="flex justify-center p-4">
              {/* Image + highlight overlay share the same positioned container */}
              <div className="relative inline-block" style={{ width: `${zoom * 100}%` }}>
                <img
                  ref={imgRef}
                  src={src}
                  alt={`Quran page ${pageNumber}`}
                  draggable={false}
                  style={{
                    display: loaded ? 'block' : 'none',
                    width: '100%',
                    height: 'auto',
                    maxWidth: 'none',
                    userSelect: 'none',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                    borderRadius: '4px',
                  }}
                  onClick={onImageClick}
                  onTouchEnd={onImageTouchEnd}
                  onLoad={() => setLoaded(true)}
                  onError={() => { setError(true); setLoaded(true); }}
                />

                {/* Row highlight — absolutely positioned over the image */}
                {loaded && highlightYFrac !== null && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{
                      top:    `${highlightYFrac * 100}%`,
                      height: `${HIGHLIGHT_HEIGHT_FRAC * 100}%`,
                      background: 'rgba(251, 191, 36, 0.35)',  // amber-400 at 35%
                      borderTop:    '2px solid rgba(217, 119, 6, 0.7)',
                      borderBottom: '2px solid rgba(217, 119, 6, 0.7)',
                      borderRadius: '2px',
                    }}
                  />
                )}

                {/* Hover guide line — shows where highlight will land while in highlight mode */}
                {loaded && highlightMode && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
                    style={{
                      top: '0', height: `${HIGHLIGHT_HEIGHT_FRAC * 100}%`,
                      background: 'rgba(251, 191, 36, 0.2)',
                      borderTop: '1px dashed rgba(217,119,6,0.5)',
                      borderBottom: '1px dashed rgba(217,119,6,0.5)',
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom hint ── */}
        <div className="text-center text-slate-400 text-xs py-2 border-t border-slate-200 shrink-0">
          {allowHighlight
            ? 'H to highlight row · Ctrl+scroll to zoom · ← → to navigate · Esc to close'
            : 'Ctrl+scroll to zoom · ← → to navigate · Esc to close'}
        </div>
      </div>

      <style>{`
        :fullscreen { background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
        :-webkit-full-screen { background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
      `}</style>
    </div>
  );
}
