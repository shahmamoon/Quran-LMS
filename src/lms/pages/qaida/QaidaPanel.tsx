/**
 * QaidaPanel — full-height Qaida page image viewer with zoom, pan, nav, and fullscreen.
 *
 * Mirrors the pattern of MushaafPanel / QuranPageModal but adapted for the Qaida
 * image folder structure (e.g. /qaida-pages/Qaida/001.png).
 *
 * Props:
 *   imageFolder — folder name on the server (from QaidaBook.imageFolder)
 *   pageNumber  — current 1-based page number
 *   totalPages  — max page number in this book
 *   onNavigate  — called with new page number when user navigates
 *   allowHighlight — show the highlight toolbar (teacher only)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw,
  Maximize2, Minimize2, FileImage,
} from 'lucide-react';
import { Spinner } from '../../components/ui';

interface QaidaPanelProps {
  imageFolder:    string;
  pageNumber:     number;
  totalPages:     number;
  onNavigate:     (page: number) => void;
  allowHighlight?: boolean;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.25;

function pad3(n: number) {
  return n.toString().padStart(3, '0');
}

export default function QaidaPanel({
  imageFolder,
  pageNumber,
  totalPages,
  onNavigate,
  allowHighlight = false,
}: QaidaPanelProps) {
  const [zoom, setZoom]               = useState(1);
  const [pan, setPan]                 = useState({ x: 0, y: 0 });
  const [dragging, setDragging]       = useState(false);
  const [dragStart, setDragStart]     = useState({ x: 0, y: 0 });
  const [loaded, setLoaded]           = useState(false);
  const [error, setError]             = useState(false);
  const [fullscreen, setFullscreen]   = useState(false);
  const [highlightY, setHighlightY]   = useState<number | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);

  const imageUrl = `/qaida-pages/${imageFolder}/${pad3(pageNumber)}.png`;

  // Reset view when page changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setHighlightY(null);
  }, [pageNumber, imageFolder]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft'  && pageNumber > 1)          onNavigate(pageNumber - 1);
      if (e.key === 'ArrowRight' && pageNumber < totalPages)  onNavigate(pageNumber + 1);
      if (e.key === '+'  || e.key === '=') zoomIn();
      if (e.key === '-')                   zoomOut();
      if (e.key === '0')                   resetView();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if ((e.key === 'h' || e.key === 'H') && allowHighlight) setHighlightMode(v => !v);
      if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false);
        else setHighlightMode(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageNumber, totalPages, fullscreen, allowHighlight]);

  // Ctrl+scroll zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.001)));
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomIn  = useCallback(() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP)), []);
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); setHighlightY(null); }, []);
  const toggleFullscreen = useCallback(() => setFullscreen(v => !v), []);

  // Mouse pan
  function onMouseDown(e: React.MouseEvent) {
    if (highlightMode) return;
    if (zoom <= 1) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }
  function onMouseUp() { setDragging(false); }

  // Click-to-highlight (teacher only)
  function onImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!highlightMode || !allowHighlight) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const yFrac = (e.clientY - rect.top) / rect.height;
    setHighlightY(Math.max(0, Math.min(1, yFrac)));
  }

  // Touch pinch-zoom
  const lastTouchDist = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / lastTouchDist.current;
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * scale)));
      lastTouchDist.current = dist;
    }
  }
  function onTouchEnd() { lastTouchDist.current = null; }

  const wrapper = (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-200 select-none overflow-hidden ${
        fullscreen ? 'fixed inset-0 z-50 bg-black' : 'h-full'
      }`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ cursor: highlightMode ? 'crosshair' : dragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 shrink-0 z-10">
        {/* Left: page nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
            title="Previous page (←)"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-700 font-medium tabular-nums min-w-[5rem] text-center">
            {pageNumber} / {totalPages}
          </span>
          <button
            onClick={() => onNavigate(Math.min(totalPages, pageNumber + 1))}
            disabled={pageNumber >= totalPages}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
            title="Next page (→)"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Center: zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={zoomOut}  className="p-1.5 rounded hover:bg-slate-100 transition-colors" title="Zoom out (-)"><ZoomOut  size={15} /></button>
          <span className="text-xs text-slate-500 tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn}   className="p-1.5 rounded hover:bg-slate-100 transition-colors" title="Zoom in (+)"><ZoomIn   size={15} /></button>
          <button onClick={resetView} className="p-1.5 rounded hover:bg-slate-100 transition-colors" title="Reset zoom (0)"><RotateCcw size={14} /></button>
        </div>

        {/* Right: highlight + fullscreen */}
        <div className="flex items-center gap-1">
          {allowHighlight && (
            <button
              onClick={() => setHighlightMode(v => !v)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                highlightMode
                  ? 'bg-amber-400 text-amber-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Toggle highlight mode (H)"
            >
              Highlight
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-slate-100 transition-colors"
            title="Fullscreen (F)"
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-start justify-center overflow-hidden p-4 relative">
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-16">
            <FileImage size={48} className="text-slate-300" />
            <div className="text-center">
              <p className="font-medium text-slate-500">Page image not found</p>
              <p className="text-xs mt-1 font-mono text-slate-400">{imageFolder}/{pad3(pageNumber)}.png</p>
              <p className="text-xs mt-2 text-slate-400">
                Place images in the <code className="bg-slate-100 px-1 rounded">{imageFolder}/</code> folder
                named <code className="bg-slate-100 px-1 rounded">001.png</code>, <code className="bg-slate-100 px-1 rounded">002.png</code>, …
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top center',
              transition: dragging ? 'none' : 'transform 0.1s ease',
              position: 'relative',
              maxWidth: '100%',
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt={`Page ${pageNumber}`}
              onLoad={() => setLoaded(true)}
              onError={() => { setLoaded(true); setError(true); }}
              onClick={onImageClick}
              style={{
                display:   loaded ? 'block' : 'none',
                maxWidth:  '100%',
                maxHeight: fullscreen ? '90vh' : '75vh',
                objectFit: 'contain',
                borderRadius: '4px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              draggable={false}
            />

            {/* Highlight overlay (teacher only) */}
            {highlightY !== null && loaded && !error && imgRef.current && (
              <div
                style={{
                  position: 'absolute',
                  left:     0,
                  right:    0,
                  top:      `calc(${highlightY * 100}% - 2.75%)`,
                  height:   '5.5%',
                  background: 'rgba(251, 191, 36, 0.35)',
                  border:     '1px solid rgba(251, 191, 36, 0.7)',
                  borderRadius: '2px',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        )}

        {/* Highlight clear button */}
        {highlightY !== null && allowHighlight && (
          <button
            onClick={() => setHighlightY(null)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-full shadow transition-colors"
          >
            Clear highlight
          </button>
        )}
      </div>

      {/* Hint bar */}
      <div className="shrink-0 flex items-center justify-center gap-4 px-4 py-1.5 bg-white border-t border-slate-200 text-[10px] text-slate-400">
        <span>← → navigate</span>
        <span>+/− zoom</span>
        <span>0 reset</span>
        <span>Ctrl+scroll zoom</span>
        {allowHighlight && <span>H highlight</span>}
        <span>F fullscreen</span>
      </div>
    </div>
  );

  return wrapper;
}
