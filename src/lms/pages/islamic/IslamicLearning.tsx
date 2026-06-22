import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Star, Check, Plus, Trash2, BookMarked, ChevronDown, ChevronRight, Volume2, Settings, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
  Button, Badge, Modal, Input, Card, CardBody, Spinner, EmptyState,
} from '../../components/ui';
import type {
  IslamicCategory, IslamicItem, IslamicProgress, IslamicBookmark,
  IslamicDashboard, IslamicContentType,
} from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: { key: IslamicContentType | 'ALL'; label: string; icon: string }[] = [
  { key: 'ALL',   label: 'All',    icon: '📚' },
  { key: 'DUA',   label: 'Duas',   icon: '🤲' },
  { key: 'SALAH', label: 'Namaz',  icon: '🕌' },
  { key: 'WUDU',  label: 'Wudu',   icon: '💦' },
  { key: 'KALIMA',label: 'Kalimas',icon: '📖' },
];

const TYPE_BADGE: Record<IslamicContentType, string> = {
  DUA:    'info',
  SALAH:  'success',
  WUDU:   'purple',
  KALIMA: 'warning',
};

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchCategories = (type?: string) =>
  api.get<{ data: IslamicCategory[] }>('/islamic/categories', { params: type && type !== 'ALL' ? { type } : {} })
     .then(r => r.data.data);

const fetchItems = (categoryId?: string, type?: string) =>
  api.get<{ data: IslamicItem[] }>('/islamic/items', {
    params: {
      ...(categoryId ? { categoryId } : {}),
      ...(type && type !== 'ALL' ? { type } : {}),
    },
  }).then(r => r.data.data);

const fetchProgress = (studentId: string) =>
  api.get<{ data: IslamicProgress[] }>(`/islamic/progress/${studentId}`)
     .then(r => r.data.data);

const fetchBookmarks = (studentId: string) =>
  api.get<{ data: IslamicBookmark[] }>(`/islamic/bookmarks/${studentId}`)
     .then(r => r.data.data);

const fetchDashboard = (studentId: string) =>
  api.get<{ data: IslamicDashboard }>(`/islamic/dashboard/${studentId}`)
     .then(r => r.data.data);

// ── Item card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  isCompleted,
  isBookmarked,
  isStaff,
  onToggleComplete,
  onToggleBookmark,
  onEdit,
  onDelete,
}: {
  item: IslamicItem;
  isCompleted: boolean;
  isBookmarked: boolean;
  isStaff: boolean;
  onToggleComplete: () => void;
  onToggleBookmark: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggleComplete(); }}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-gray-300 hover:border-emerald-400'
          }`}
          title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        >
          {isCompleted && <Check size={12} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{item.title}</span>
            {item.rakatType && (
              <Badge variant="default">{item.rakatType}</Badge>
            )}
            {item.rakatCount != null && (
              <Badge variant="info">{item.rakatCount} rakat</Badge>
            )}
            {item.stepNumber != null && (
              <Badge variant="purple">Step {item.stepNumber}</Badge>
            )}
          </div>
          {item.arabicText && (
            <p className="text-sm text-gray-500 mt-0.5 truncate font-arabic" dir="rtl">
              {item.arabicText.substring(0, 60)}{item.arabicText.length > 60 ? '…' : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {item.audioUrl && (
            <a
              href={item.audioUrl}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
              title="Listen"
            >
              <Volume2 size={14} />
            </a>
          )}
          <button
            onClick={e => { e.stopPropagation(); onToggleBookmark(); }}
            className={`p-1.5 rounded transition-colors ${
              isBookmarked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-400'
            }`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <Star size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          {isStaff && onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 text-gray-400 hover:text-blue-500 rounded text-xs"
              title="Edit"
            >
              ✏️
            </button>
          )}
          {isStaff && onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded"
              title="Delete item"
            >
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {item.arabicText && (
            <div className="text-right">
              <p className="text-xl leading-loose text-gray-900 font-arabic" dir="rtl">
                {item.arabicText}
              </p>
            </div>
          )}
          {item.transliteration && (
            <p className="text-sm text-blue-700 italic">{item.transliteration}</p>
          )}
          {item.englishTranslation && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">English</span>
              <p className="text-sm text-gray-700 mt-1">{item.englishTranslation}</p>
            </div>
          )}
          {item.urduTranslation && (
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">اردو</span>
              <p className="text-sm text-gray-700 mt-1 font-urdu" dir="rtl">{item.urduTranslation}</p>
            </div>
          )}
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.title} className="max-w-full rounded" />
          )}
        </div>
      )}
    </div>
  );
}

// ── Category section ──────────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  progressMap,
  bookmarkSet,
  isStaff,
  isAdmin,
  onToggleComplete,
  onToggleBookmark,
  onEditItem,
  onDeleteItem,
}: {
  category: IslamicCategory;
  items: IslamicItem[];
  progressMap: Map<string, IslamicProgress>;
  bookmarkSet: Set<string>;
  isStaff: boolean;
  isAdmin: boolean;
  onToggleComplete: (item: IslamicItem) => void;
  onToggleBookmark: (item: IslamicItem) => void;
  onEditItem: (item: IslamicItem) => void;
  onDeleteItem: (item: IslamicItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const completedCount = items.filter(i => progressMap.get(i.id)?.completed).length;

  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left mb-3"
      >
        <span className="text-lg">{category.icon ?? '📂'}</span>
        <h3 className="font-semibold text-gray-900">{category.name}</h3>
        <span className="text-xs text-gray-500 ml-1">
          {completedCount}/{items.length}
        </span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full mx-2 overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: `${items.length ? (completedCount / items.length) * 100 : 0}%` }}
          />
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="space-y-2">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              isCompleted={progressMap.get(item.id)?.completed ?? false}
              isBookmarked={bookmarkSet.has(item.id)}
              isStaff={isStaff}
              onToggleComplete={() => onToggleComplete(item)}
              onToggleBookmark={() => onToggleBookmark(item)}
              onEdit={isStaff ? () => onEditItem(item) : undefined}
              onDelete={isAdmin ? () => onDeleteItem(item) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category form modal ───────────────────────────────────────────────────────

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type CategoryForm = {
  name: string; slug: string; type: IslamicContentType | ''; icon: string;
  description: string; order: number; isActive: boolean;
};

function CategoryFormModal({
  open,
  category,
  onClose,
  onSave,
}: {
  open: boolean;
  category: IslamicCategory | null;
  onClose: () => void;
  onSave: (data: Partial<IslamicCategory> & { id?: string }) => void;
}) {
  const blank: CategoryForm = { name: '', slug: '', type: '', icon: '📂', description: '', order: 0, isActive: true };
  const [form, setForm] = useState<CategoryForm>(blank);

  useMemo(() => {
    if (category) {
      setForm({
        name:        category.name,
        slug:        category.slug,
        type:        category.type ?? '',
        icon:        category.icon ?? '📂',
        description: category.description ?? '',
        order:       category.order,
        isActive:    category.isActive,
      });
    } else {
      setForm(blank);
    }
  }, [category, open]);

  const set = <K extends keyof CategoryForm>(k: K, v: CategoryForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleNameChange = (v: string) => {
    setForm(f => ({ ...f, name: v, ...(!category ? { slug: toSlug(v) } : {}) }));
  };

  return (
    <Modal open={open} onClose={onClose} title={category ? 'Edit Category' : 'Add Category'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Morning Duas"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Slug *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.slug}
              onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="morning-duas"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={form.type}
              onChange={e => set('type', e.target.value as IslamicContentType | '')}
            >
              <option value="">General (no type)</option>
              <option value="DUA">Dua</option>
              <option value="SALAH">Salah / Namaz</option>
              <option value="WUDU">Wudu</option>
              <option value="KALIMA">Kalima</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Icon (emoji)</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={form.icon}
              onChange={e => set('icon', e.target.value)}
              placeholder="🤲"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
            rows={2}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Optional description for this category"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Display Order</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={form.order}
              onChange={e => set('order', Number(e.target.value))}
              min={0}
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="cat-isActive"
              checked={form.isActive}
              onChange={e => set('isActive', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="cat-isActive" className="text-sm text-gray-700">Active</label>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            if (!form.name.trim()) { toast.error('Name is required'); return; }
            if (!form.slug.trim()) { toast.error('Slug is required'); return; }
            onSave({
              ...form,
              type: (form.type || null) as IslamicContentType | null,
              ...(category?.id ? { id: category.id } : {}),
            });
          }}
        >
          Save Category
        </Button>
      </div>
    </Modal>
  );
}

// ── Admin modals ──────────────────────────────────────────────────────────────

function ItemModal({
  open,
  item,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  item: IslamicItem | null;
  categories: IslamicCategory[];
  onClose: () => void;
  onSave: (data: Partial<IslamicItem>) => void;
}) {
  const [form, setForm] = useState<Partial<IslamicItem>>(item ?? {
    type: 'DUA', order: 0, isActive: true,
  });

  // Sync when item changes
  useMemo(() => { setForm(item ?? { type: 'DUA', order: 0, isActive: true }); }, [item]);

  const set = (k: keyof IslamicItem, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit Item' : 'Add Item'}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.type ?? 'DUA'}
            onChange={e => set('type', e.target.value as IslamicContentType)}
          >
            <option value="DUA">Dua</option>
            <option value="SALAH">Salah</option>
            <option value="WUDU">Wudu</option>
            <option value="KALIMA">Kalima</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.categoryId ?? ''}
            onChange={e => set('categoryId', e.target.value)}
          >
            <option value="">Select category…</option>
            {categories
              .filter(c => c.isActive && (c.type === null || c.type === form.type))
              .map(c => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
              ))}
          </select>
        </div>
        <Input label="Title *" value={form.title ?? ''} onChange={v => set('title', v)} />
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Arabic Text</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-arabic"
            dir="rtl"
            rows={3}
            value={form.arabicText ?? ''}
            onChange={e => set('arabicText', e.target.value)}
            placeholder="أَعُوذُ بِاللَّهِ..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Transliteration</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={2}
            value={form.transliteration ?? ''}
            onChange={e => set('transliteration', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">English Translation</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={2}
            value={form.englishTranslation ?? ''}
            onChange={e => set('englishTranslation', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Urdu Translation</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-urdu"
            dir="rtl"
            rows={2}
            value={form.urduTranslation ?? ''}
            onChange={e => set('urduTranslation', e.target.value)}
          />
        </div>
        {form.type === 'SALAH' && (
          <div className="grid grid-cols-3 gap-2">
            <Input label="Prayer Name" value={form.prayerName ?? ''} onChange={v => set('prayerName', v)} />
            <Input label="Rakat Count" type="number" value={String(form.rakatCount ?? '')} onChange={v => set('rakatCount', Number(v))} />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rakat Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.rakatType ?? ''}
                onChange={e => set('rakatType', e.target.value)}
              >
                <option value="">—</option>
                <option>Fard</option>
                <option>Sunnah</option>
                <option>Nafl</option>
                <option>Witr</option>
              </select>
            </div>
          </div>
        )}
        {(form.type === 'WUDU' || form.type === 'SALAH') && (
          <Input label="Step Number" type="number" value={String(form.stepNumber ?? '')} onChange={v => set('stepNumber', Number(v))} />
        )}
        <div className="grid grid-cols-2 gap-2">
          <Input label="Audio URL" value={form.audioUrl ?? ''} onChange={v => set('audioUrl', v)} />
          <Input label="Image URL" value={form.imageUrl ?? ''} onChange={v => set('imageUrl', v)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Order" type="number" value={String(form.order ?? 0)} onChange={v => set('order', Number(v))} />
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive ?? true}
              onChange={e => set('isActive', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)}>Save</Button>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IslamicLearning() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const isAdmin   = user?.role === 'ADMIN';
  const isStaff   = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const studentId = user?.id ?? '';

  const [activeTab, setActiveTab] = useState<IslamicContentType | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem]   = useState<IslamicItem | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Category management (admin only)
  const [showCatPanel, setShowCatPanel]     = useState(false);
  const [showCatModal, setShowCatModal]     = useState(false);
  const [editingCat,   setEditingCat]       = useState<IslamicCategory | null>(null);

  // Data queries
  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ['islamic-categories', activeTab],
    queryFn:  () => fetchCategories(activeTab),
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['islamic-items', activeTab, selectedCategory],
    queryFn:  () => fetchItems(selectedCategory ?? undefined, activeTab),
    enabled:  true,
  });

  const { data: progressList = [] } = useQuery({
    queryKey: ['islamic-progress', studentId],
    queryFn:  () => fetchProgress(studentId),
    enabled:  !!studentId,
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['islamic-bookmarks', studentId],
    queryFn:  () => fetchBookmarks(studentId),
    enabled:  !!studentId,
  });

  const { data: dashboard } = useQuery({
    queryKey: ['islamic-dashboard', studentId],
    queryFn:  () => fetchDashboard(studentId),
    enabled:  !!studentId,
  });

  // Admin: all categories (including inactive) for management panel
  const { data: allCatsAdmin = [] } = useQuery<IslamicCategory[]>({
    queryKey: ['islamic-categories-admin'],
    queryFn:  () => api.get<{ data: IslamicCategory[] }>('/islamic/categories').then(r => r.data.data),
    enabled:  isAdmin && showCatPanel,
  });

  // Derived maps
  const progressMap = useMemo(() => {
    const m = new Map<string, IslamicProgress>();
    progressList.forEach(p => m.set(p.itemId, p));
    return m;
  }, [progressList]);

  const bookmarkSet = useMemo(() => new Set<string>(bookmarks.map((b: IslamicBookmark) => b.itemId)), [bookmarks]);
  const bookmarkIdMap = useMemo(() => {
    const m = new Map<string, string>();
    bookmarks.forEach(b => m.set(b.itemId, b.id));
    return m;
  }, [bookmarks]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const m = new Map<string, IslamicItem[]>();
    const filtered = selectedCategory
      ? items.filter(i => i.categoryId === selectedCategory)
      : items;
    filtered.forEach(item => {
      const arr = m.get(item.categoryId) ?? [];
      arr.push(item);
      m.set(item.categoryId, arr);
    });
    return m;
  }, [items, selectedCategory]);

  const visibleCategories = useMemo(() =>
    categories.filter(c => itemsByCategory.has(c.id) && (itemsByCategory.get(c.id)?.length ?? 0) > 0),
    [categories, itemsByCategory],
  );

  // Mutations
  const toggleProgressMutation = useMutation({
    mutationFn: ({ item, completed }: { item: IslamicItem; completed: boolean }) =>
      api.put(`/islamic/progress/${studentId}/${item.id}`, { completed }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['islamic-progress', studentId] });
      qc.invalidateQueries({ queryKey: ['islamic-dashboard', studentId] });
    },
    onError: () => toast.error('Failed to update progress'),
  });

  const addBookmarkMutation = useMutation({
    mutationFn: (itemId: string) =>
      api.post('/islamic/bookmarks', { studentId, itemId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['islamic-bookmarks', studentId] });
      toast.success('Bookmarked');
    },
    onError: () => toast.error('Failed to bookmark'),
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: (bookmarkId: string) =>
      api.delete(`/islamic/bookmarks/${bookmarkId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['islamic-bookmarks', studentId] });
      toast.success('Bookmark removed');
    },
    onError: () => toast.error('Failed to remove bookmark'),
  });

  const saveItemMutation = useMutation({
    mutationFn: (data: Partial<IslamicItem>) =>
      editingItem
        ? api.patch(`/islamic/items/${editingItem.id}`, data)
        : api.post('/islamic/items', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['islamic-items'] });
      setShowItemModal(false);
      setEditingItem(null);
      toast.success(editingItem ? 'Item updated' : 'Item added');
    },
    onError: () => toast.error('Failed to save item'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/islamic/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['islamic-items'] });
      toast.success('Item deleted');
    },
    onError: () => toast.error('Failed to delete item'),
  });

  const saveCatMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<IslamicCategory> & { id?: string }) =>
      id
        ? api.patch(`/islamic/categories/${id}`, data)
        : api.post('/islamic/categories', data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['islamic-categories-admin'] });
      qc.invalidateQueries({ queryKey: ['islamic-categories'] });
      setShowCatModal(false);
      setEditingCat(null);
      toast.success(vars.id ? 'Category updated' : 'Category created');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to save category';
      toast.error(msg);
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/islamic/categories/${id}`),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['islamic-categories-admin'] });
      qc.invalidateQueries({ queryKey: ['islamic-categories'] });
      if (res.data?.data?.softDisabled) {
        toast.success('Category has items — marked as inactive instead of deleted');
      } else {
        toast.success('Category deleted');
      }
    },
    onError: () => toast.error('Failed to delete category'),
  });

  const handleToggleComplete = (item: IslamicItem) => {
    const current = progressMap.get(item.id)?.completed ?? false;
    toggleProgressMutation.mutate({ item, completed: !current });
  };

  const handleToggleBookmark = (item: IslamicItem) => {
    if (!isStaff) return; // students view-only for bookmarks
    if (bookmarkSet.has(item.id)) {
      const bid = bookmarkIdMap.get(item.id);
      if (bid) removeBookmarkMutation.mutate(bid);
    } else {
      addBookmarkMutation.mutate(item.id);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={24} className="text-green-600" />
            Islamic Learning
          </h1>
          {dashboard && (
            <p className="text-sm text-gray-500 mt-1">
              {dashboard.completedCount} / {dashboard.totalItems} completed
              {' '}({dashboard.completionPercentage}%)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBookmarks(b => !b)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              showBookmarks
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BookMarked size={14} />
            Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}
          </button>
          {isAdmin && (
            <Button
              size="sm"
              variant={showCatPanel ? 'primary' : 'outline'}
              onClick={() => setShowCatPanel(p => !p)}
            >
              <Settings size={14} className="mr-1" />
              Categories
            </Button>
          )}
          {isStaff && (
            <Button
              size="sm"
              onClick={() => { setEditingItem(null); setShowItemModal(true); }}
            >
              <Plus size={14} className="mr-1" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard summary */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {dashboard.typeBreakdown.map(t => (
            <Card key={t.type}>
              <CardBody className="p-3 text-center">
                <div className="text-lg font-bold text-gray-900">{t.completed}</div>
                <div className="text-xs text-gray-500 capitalize">{t.type.toLowerCase()} completed</div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ── Admin: Category management panel ──────────────────── */}
      {isAdmin && showCatPanel && (
        <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Settings size={15} className="text-gray-500" />
              Manage Categories
            </h2>
            <Button
              size="sm"
              onClick={() => { setEditingCat(null); setShowCatModal(true); }}
            >
              <Plus size={14} className="mr-1" /> Add Category
            </Button>
          </div>

          {allCatsAdmin.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">No categories yet. Add one above.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {[...allCatsAdmin]
                .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
                .map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <span className="text-lg w-7 text-center flex-shrink-0">{cat.icon ?? '📂'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                        {cat.type && (
                          <Badge variant="info">{cat.type}</Badge>
                        )}
                        {!cat.type && (
                          <Badge variant="default">General</Badge>
                        )}
                        {!cat.isActive && (
                          <Badge variant="danger">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Slug: {cat.slug} · Order: {cat.order}
                        {(cat._count?.items ?? 0) > 0 && ` · ${cat._count?.items} item${(cat._count?.items ?? 0) === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!cat.isActive && (
                        <button
                          onClick={() => api.patch(`/islamic/categories/${cat.id}`, { isActive: true }).then(() => {
                            qc.invalidateQueries({ queryKey: ['islamic-categories-admin'] });
                            qc.invalidateQueries({ queryKey: ['islamic-categories'] });
                            toast.success('Category enabled');
                          }).catch(() => toast.error('Failed to enable category'))}
                          className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Enable
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingCat(cat); setShowCatModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                        title="Edit category"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          const hasItems = (cat._count?.items ?? 0) > 0;
                          const msg = hasItems
                            ? `"${cat.name}" has ${cat._count?.items} item(s). It will be marked inactive instead of deleted. Continue?`
                            : `Delete category "${cat.name}"?`;
                          if (confirm(msg)) deleteCatMutation.mutate(cat.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title={`${(cat._count?.items ?? 0) > 0 ? 'Disable' : 'Delete'} category`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Bookmarks panel */}
      {showBookmarks && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Star size={16} className="text-amber-500" />
              Bookmarks
            </h3>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-gray-500">No bookmarks yet.</p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{b.item?.title}</p>
                      {b.note && <p className="text-xs text-gray-500">{b.note}</p>}
                    </div>
                    <Badge variant={TYPE_BADGE[b.item?.type ?? 'DUA'] as any}>
                      {b.item?.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as IslamicContentType | 'ALL');
              setSelectedCategory(null);
            }}
            className={`flex-1 min-w-max flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              !selectedCategory ? 'bg-green-600 border-green-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loadingCats || loadingItems ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : visibleCategories.length === 0 ? (
        <EmptyState
          title="No content yet"
          description={isAdmin ? 'Add your first Islamic learning item above.' : 'Content will appear here soon.'}
          icon={<BookOpen size={40} className="text-gray-300" />}
        />
      ) : (
        visibleCategories.map(cat => (
          <CategorySection
            key={cat.id}
            category={cat}
            items={itemsByCategory.get(cat.id) ?? []}
            progressMap={progressMap}
            bookmarkSet={bookmarkSet}
            isStaff={isStaff}
            isAdmin={isAdmin}
            onToggleComplete={handleToggleComplete}
            onToggleBookmark={handleToggleBookmark}
            onEditItem={item => { setEditingItem(item); setShowItemModal(true); }}
            onDeleteItem={item => {
              if (confirm(`Delete "${item.title}"?`)) deleteItemMutation.mutate(item.id);
            }}
          />
        ))
      )}

      {/* Category add/edit modal */}
      {isAdmin && (
        <CategoryFormModal
          open={showCatModal}
          category={editingCat}
          onClose={() => { setShowCatModal(false); setEditingCat(null); }}
          onSave={data => saveCatMutation.mutate(data)}
        />
      )}

      {/* Item edit/add modal */}
      {showItemModal && (
        <ItemModal
          open={showItemModal}
          item={editingItem}
          categories={categories}
          onClose={() => { setShowItemModal(false); setEditingItem(null); }}
          onSave={data => saveItemMutation.mutate(data)}
        />
      )}
    </div>
  );
}
