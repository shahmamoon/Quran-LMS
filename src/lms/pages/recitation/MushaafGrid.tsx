import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import type { QuranPage, PageProgress, PageStatus } from '../../types';
import QuranPageModal from '../../components/ui/QuranPageModal';

interface MushaafGridProps {
  pages: QuranPage[];
  progress: PageProgress[];         // may be empty (no sessions yet)
  selectedPage: number | null;
  onPageClick: (page: QuranPage) => void;
  highlightReview?: boolean;         // flash NEEDS_REVIEW pages
  showPageViewer?: boolean;          // open image viewer on click (in addition to onPageClick)
  allowHighlight?: boolean;          // teacher mode — enables row highlighting in the viewer
}

const STATUS_COLOR: Record<PageStatus, string> = {
  INTRODUCED:   'bg-sky-100 border-sky-300 text-sky-800',
  PRACTICING:   'bg-amber-100 border-amber-300 text-amber-800',
  COMPLETED:    'bg-emerald-100 border-emerald-400 text-emerald-800',
  NEEDS_REVIEW: 'bg-red-100 border-red-400 text-red-800',
};

const STATUS_LABEL: Record<PageStatus, string> = {
  INTRODUCED:   'Introduced',
  PRACTICING:   'Practicing',
  COMPLETED:    'Completed',
  NEEDS_REVIEW: 'Needs Review',
};

const JUZ_START_PAGES = [
  1, 22, 43, 62, 82, 102, 121, 142, 162, 182,
  201, 221, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 524, 542, 562, 582,
];

export default function MushaafGrid({ pages, progress, selectedPage, onPageClick, highlightReview, showPageViewer, allowHighlight }: MushaafGridProps) {
  const [filterJuz, setFilterJuz] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<PageStatus | 'NOT_STARTED' | null>(null);
  const [viewerPage, setViewerPage] = useState<number | null>(null);

  const progressMap = useMemo(() => {
    const map = new Map<number, PageProgress>();
    progress.forEach(p => map.set(p.pageNumber, p));
    return map;
  }, [progress]);

  const filtered = useMemo(() => {
    return pages.filter(page => {
      if (filterJuz !== null && page.juzNumber !== filterJuz) return false;
      if (filterStatus !== null) {
        const p = progressMap.get(page.pageNumber);
        const status = p?.currentStatus ?? null;
        if (filterStatus === 'NOT_STARTED' && status !== null) return false;
        if (filterStatus !== 'NOT_STARTED' && status !== filterStatus) return false;
      }
      return true;
    });
  }, [pages, filterJuz, filterStatus, progressMap]);

  // Stats for legend
  const stats = useMemo(() => {
    const counts: Record<string, number> = { NOT_STARTED: 0, INTRODUCED: 0, PRACTICING: 0, COMPLETED: 0, NEEDS_REVIEW: 0 };
    pages.forEach(page => {
      const p = progressMap.get(page.pageNumber);
      counts[p?.currentStatus ?? 'NOT_STARTED']++;
    });
    return counts;
  }, [pages, progressMap]);

  return (
    <>
    <div className="flex flex-col gap-4">
      {/* Legend + stats */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => setFilterStatus(null)}
          className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
            filterStatus === null ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300')}
        >
          All <span className="opacity-70">604</span>
        </button>
        <button
          onClick={() => setFilterStatus(f => f === 'NOT_STARTED' ? null : 'NOT_STARTED')}
          className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
            filterStatus === 'NOT_STARTED' ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300')}
        >
          <span className="w-2 h-2 rounded-sm bg-slate-200 border border-slate-300" />
          Not Started <span className="opacity-70">{stats.NOT_STARTED}</span>
        </button>
        {(['INTRODUCED', 'PRACTICING', 'COMPLETED', 'NEEDS_REVIEW'] as PageStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(f => f === s ? null : s)}
            className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
              filterStatus === s
                ? STATUS_COLOR[s].replace('bg-', 'bg-').replace('100', '200') + ' font-semibold'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            <span className={cn('w-2 h-2 rounded-sm border', STATUS_COLOR[s])} />
            {STATUS_LABEL[s]} <span className="opacity-70">{stats[s]}</span>
          </button>
        ))}
      </div>

      {/* Juz filter */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setFilterJuz(null)}
          className={cn('px-2 py-0.5 rounded text-xs font-medium transition-all',
            filterJuz === null ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
        >
          All Juz
        </button>
        {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
          <button
            key={j}
            onClick={() => setFilterJuz(f => f === j ? null : j)}
            className={cn('px-2 py-0.5 rounded text-xs font-medium transition-all',
              filterJuz === j ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
          >
            {j}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex flex-wrap gap-1">
        {filtered.map(page => {
          const prog = progressMap.get(page.pageNumber);
          const status = prog?.currentStatus ?? null;
          const isSelected = selectedPage === page.pageNumber;
          const isJuzStart = JUZ_START_PAGES.includes(page.pageNumber);
          const needsReview = status === 'NEEDS_REVIEW';

          return (
            <button
              key={page.pageNumber}
              title={`Page ${page.pageNumber} · ${page.surahNameEn} · Juz ${page.juzNumber}${status ? ` · ${STATUS_LABEL[status]}` : ''}`}
              onClick={() => { onPageClick(page); if (showPageViewer) setViewerPage(page.pageNumber); }}
              className={cn(
                'relative w-9 h-9 rounded text-[10px] font-semibold border transition-all duration-100 select-none',
                // base color
                status ? STATUS_COLOR[status] : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400',
                // selected ring
                isSelected && 'ring-2 ring-brand-500 ring-offset-1 z-10',
                // juz boundary marker
                isJuzStart && !isSelected && 'border-l-2 border-l-brand-400',
                // review pulse
                needsReview && highlightReview && 'animate-pulse',
                'hover:opacity-80 hover:scale-110 hover:z-10'
              )}
            >
              {page.pageNumber}
              {prog?.majorErrorCount ? (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center leading-none">
                  {prog.majorErrorCount > 9 ? '9+' : prog.majorErrorCount}
                </span>
              ) : null}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 py-4">No pages match the current filter.</p>
        )}
      </div>
    </div>

    {showPageViewer && (
      <QuranPageModal
        pageNumber={viewerPage}
        onClose={() => setViewerPage(null)}
        onNavigate={(n: number) => {
          setViewerPage(n);
          const p = pages.find(pg => pg.pageNumber === n);
          if (p) onPageClick(p);
        }}
        allowHighlight={allowHighlight}
      />
    )}
    </>
  );
}
