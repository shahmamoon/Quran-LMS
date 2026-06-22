import { cn } from '../../lib/utils';
import { forwardRef, useId, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

// ─── Button ───────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-300 shadow-sm',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-300',
  ghost:     'text-slate-600 hover:bg-slate-100 focus:ring-slate-200',
  danger:    'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300',
  outline:   'border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-200',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {!loading && icon}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

// ─── Input ────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, id: propId, ...props }, ref) => {
    const autoId = useId();
    const id = propId ?? autoId;
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500 disabled:opacity-50 disabled:bg-slate-50 transition-colors',
            error && 'border-red-400 focus:ring-red-300',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
        {helper && !error && <span className="text-xs text-slate-500">{helper}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id: propId, ...props }, ref) => {
    const autoId = useId();
    const id = propId ?? autoId;
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500 disabled:opacity-50 resize-none transition-colors',
            error && 'border-red-400',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ─── Select ───────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id: propId, options, ...props }, ref) => {
    const autoId = useId();
    const id = propId ?? autoId;
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>}
        <select
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500 bg-white transition-colors',
            error && 'border-red-400',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
          ))}
        </select>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ─── Badge ────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface BadgeProps { variant?: BadgeVariant; className?: string; children: ReactNode }

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger:  'bg-red-50 text-red-600',
  info:    'bg-blue-50 text-blue-700',
  purple:  'bg-purple-50 text-purple-700',
};

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badgeVariants[variant], className)}>
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────
interface CardProps { className?: string; children: ReactNode }

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardProps) {
  return <div className={cn('px-6 py-4 border-b border-slate-100', className)}>{children}</div>;
}

export function CardBody({ className, children }: CardProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

// ─── Avatar ───────────────────────────────────────────────────
interface AvatarProps { src?: string | null; name: string; size?: 'sm' | 'md' | 'lg'; className?: string }

const avatarSizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    return <img src={src} alt={name} className={cn('rounded-full object-cover', avatarSizes[size], className)} />;
  }
  return (
    <div className={cn('rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold', avatarSizes[size], className)}>
      {initials}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <div className={cn('w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin', className)} />;
}

// ─── Empty State ──────────────────────────────────────────────
interface EmptyStateProps { icon?: ReactNode; title: string; description?: string; action?: ReactNode }

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-slate-300 mb-4">{icon}</div>}
      <h3 className="text-slate-600 font-semibold mb-1">{title}</h3>
      {description && <p className="text-slate-400 text-sm mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title?: string; children: ReactNode; className?: string }

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto', className)}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors text-lg leading-none"
            >
              &times;
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────
interface ProgressBarProps { value: number; max?: number; className?: string; label?: string }

export function ProgressBar({ value, max = 100, className, label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{label}</span>
          <span className="font-medium text-slate-700">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────
interface StatCardProps { label: string; value: string | number; icon?: ReactNode; delta?: string; color?: string }

// Map text-{color}-600 → bg-{color}-50 so icon has a tinted background
const iconBgMap: Record<string, string> = {
  'text-blue-600':    'bg-blue-50',
  'text-purple-600':  'bg-purple-50',
  'text-emerald-600': 'bg-emerald-50',
  'text-amber-600':   'bg-amber-50',
  'text-green-600':   'bg-green-50',
  'text-brand-600':   'bg-brand-50',
  'text-red-600':     'bg-red-50',
  'text-indigo-600':  'bg-indigo-50',
  'text-rose-600':    'bg-rose-50',
};

export function StatCard({ label, value, icon, delta, color = 'text-brand-600' }: StatCardProps) {
  const iconBg = iconBgMap[color] ?? 'bg-slate-50';
  return (
    <Card>
      <CardBody className="flex items-center gap-4 py-5">
        {icon && (
          <div className={cn('p-2.5 rounded-xl shrink-0', iconBg, color)}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-800 leading-tight mt-0.5">{value}</p>
          {delta && <p className="text-xs text-slate-400 mt-0.5">{delta}</p>}
        </div>
      </CardBody>
    </Card>
  );
}
