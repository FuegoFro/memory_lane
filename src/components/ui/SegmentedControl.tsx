'use client';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-labelledby'?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-labelledby': ariaLabelledBy,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-labelledby={ariaLabelledBy}
      className="flex border border-gray-700 rounded-lg overflow-hidden"
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={[
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            index > 0 ? 'border-l border-gray-700' : '',
            option.value === value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200',
          ].join(' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
