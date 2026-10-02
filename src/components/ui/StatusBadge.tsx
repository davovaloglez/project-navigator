interface StatusBadgeProps {
  label: string;
  bg: string;
  text: string;
  dot?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ label, bg, text, dot, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${bg} ${text} ${sizeClasses}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
}
