interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({ value, max, label, color = 'bg-blue-500', showPercentage = true, size = 'md' }: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const heightClasses = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-slate-300">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-medium text-slate-400">{percentage}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-700 rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`${color} ${heightClasses[size]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
