import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize, Minimize, RotateCcw, Highlighter,
} from 'lucide-react';

interface Props {
  pageNumber: number;
  totalPages?: number;
  onNavigate: (page: number) => void;
  allowHighlight?: boolean;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const HIGHLIGHT_HEIGHT_FRAC = 0.055;

export default function MushaafPanel({
  pageNumber,
  totalPages = 604,
  onNavigate,
  allowHighlight,
}: Props) {
  const [loaded, setLoaded]               = useState(false);
  const [imgError, setImgError]           = useState(false);
  const [zoom, setZoom]                   = useState(1);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [isDragging, setIsDragging]       = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightYFrac, setHighlightYFrac] = useState<number | null>(null);

  const containerRef  = useRef<HTMLDivElement>(null);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const imgRef        = useRef<HTMLImageElement>(null);
  const lastPos       = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const draggingRef   = useRef(false);

  useEffect(() => {
    setLoaded(false);
    setImgError(false);
    setZoom(1);
    setHighlightYFrac(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pageNumber]);

  useEffect(() => { if (!allowHighlight) setHighlightMode(false); }, [allowHighlight]);

  const applyZoom = useCallback((next: number) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  }, []);

  // Keyboard shortcuts (only when container is focused / fullscreen)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft'  && pageNumber > 1)         onNavigate(pageNumber - 1);
      if (e.key === 'ArrowRight' && pageNumber < totalPages) onNavigate(pageNumber + 1);
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey)   applyZoom(zoom + ZOOM_STEP);
      if (e.key === '-' && !e.ctrlKey)                       applyZoom(zoom - ZOOM_STEP);
      if (e.key === '0') setZoom(1);
      if (e.key === 'h' && allowHighlight) setHighlightMode(m => !m);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageNumber, totalPages, onNavigate, zoom, applyZoom, allowHighlight]);

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

  function onImageClick(e: React.MouseEvent) {
    if (!highlightMode || !imgRef.current) return;
    e.stopPropagation();
    const rect = imgRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1 - HIGHLIGHT_HEIGHT_FRAC, (e.clientY - rect.top) / rect.height - HIGHLIGHT_HEIGHT_FRAC / 2));
    setHighlightYFrac(frac);
  }

  function onImageTouchEnd(e: React.TouchEvent) {
    if (!highlightMode || !imgRef.current || lastPinchDist.current !== null) return;
    if (e.changedTouches.length !== 1) return;
    const rect = imgRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1 - HIGHLIGHT_HEIGHT_FRAC, (e.changedTouches[0].clientY - rect.top) / rect.height - HIGHLIGHT_HEIGHT_FRAC / 2));
    setHighlightYFrac(frac);
  }

  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1 || highlightMode) return;
    draggingRef.current = true; setIsDragging(true);
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

  function toggleFullscreen() {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const src    = `/quran-pages/${String(pageNumber).padStart(3, '0')}.png`;
  const cursor = highlightMode ? 'crosshair' : zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-slate-100 overflow-hidden"
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 shrink-0 gap-2 flex-wrap">
        {/* Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => pageNumber > 1 && onNavigate(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 transition-colors"
            title="Previous page (←)"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-slate-700 tabular-nums whitespace-nowrap">
            Page <span className="text-slate-900 font-bold">{pageNumber}</span>
            <span className="text-slate-400"> / {totalPages}</span>
          </span>
          <button
            onClick={() => pageNumber < totalPages && onNavigate(pageNumber + 1)}
            disabled={pageNumber >= totalPages}
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 transition-colors"
            title="Next page (→)"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom + tools */}
        <div className="flex items-center gap-0.5">
          {allowHighlight && (
            <>
              <button
                onClick={() => setHighlightMode(m => !m)}
                title={highlightMode ? 'Exit highlight mode (H)' : 'Highlight a row (H)'}
                className={`p-1.5 rounded transition-colors ${
                  highlightMode
                    ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Highlighter size={15} />
              </button>
              {highlightYFrac !== null && !highlightMode && (
                <button
                  onClick={() => setHighlightYFrac(null)}
                  className="text-xs text-slate-400 hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Clear
                </button>
              )}
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
            </>
          )}

          <button
            onClick={() => applyZoom(zoom - ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            title="Zoom out (−)"
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => setZoom(1)}
            title="Reset zoom (0)"
            className="min-w-[3rem] text-center text-xs font-mono text-slate-500 hover:text-slate-800 px-1.5 py-1.5 rounded hover:bg-slate-100 transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => applyZoom(zoom + ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            title="Zoom in (+)"
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ZoomIn size={15} />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button
            onClick={() => { setZoom(1); setHighlightYFrac(null); if (scrollRef.current) scrollRef.current.scrollTop = 0; }}
            title="Reset view"
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {/* ── Image area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto min-h-0"
        style={{ cursor }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {!loaded && !imgError && (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {imgError ? (
          <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[300px] text-slate-400">
            <span className="text-4xl">📖</span>
            <p className="text-sm font-medium">Page image not available</p>
            <p className="text-xs text-center max-w-xs">
              Place Madani Mushaf page images in the <code className="bg-slate-100 px-1 rounded">Quran/</code> folder
              as <code className="bg-slate-100 px-1 rounded">001.png … 604.png</code>
            </p>
          </div>
        ) : (
          <div className="flex justify-center p-4">
            <div className="relative inline-block" style={{ width: `${zoom * 100}%` }}>
              <img
                ref={imgRef}
                src={src}
                alt={`Quran page ${pageNumber}`}
                draggable={false}
                className="w-full h-auto select-none"
                style={{
                  display: loaded ? 'block' : 'none',
                  maxWidth: 'none',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                  borderRadius: '4px',
                }}
                onClick={onImageClick}
                onTouchEnd={onImageTouchEnd}
                onLoad={() => setLoaded(true)}
                onError={() => { setImgError(true); setLoaded(true); }}
              />

              {loaded && highlightYFrac !== null && (
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    top:    `${highlightYFrac * 100}%`,
                    height: `${HIGHLIGHT_HEIGHT_FRAC * 100}%`,
                    background: 'rgba(251,191,36,0.35)',
                    borderTop:    '2px solid rgba(217,119,6,0.7)',
                    borderBottom: '2px solid rgba(217,119,6,0.7)',
                    borderRadius: '2px',
                  }}
                />
              )}

              {loaded && highlightMode && (
                <div
                  className="absolute left-0 right-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
                  style={{
                    top: '0', height: `${HIGHLIGHT_HEIGHT_FRAC * 100}%`,
                    background: 'rgba(251,191,36,0.2)',
                    borderTop:    '1px dashed rgba(217,119,6,0.5)',
                    borderBottom: '1px dashed rgba(217,119,6,0.5)',
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Hint bar ── */}
      <div className="text-center text-slate-400 text-xs py-1.5 border-t border-slate-200 shrink-0 hidden sm:block">
        {allowHighlight
          ? 'H = highlight · Ctrl+scroll = zoom · ← → = navigate'
          : 'Ctrl+scroll = zoom · ← → = navigate'}
      </div>

      <style>{`
        :fullscreen { background:#1e293b; display:flex; align-items:stretch; }
        :-webkit-full-screen { background:#1e293b; display:flex; align-items:stretch; }
      `}</style>
    </div>
  );
}
