interface EvidenceChipProps {
  quote: string;
  onInspect?: (quote: string) => void;
}

export default function EvidenceChip({ quote, onInspect }: EvidenceChipProps) {
  if (onInspect) {
    return (
      <button
        onClick={() => onInspect(quote)}
        className="w-full flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 hover:bg-brand-50 hover:border-brand-200 transition-colors text-left group"
        title="Click to locate in source text"
      >
        <span className="text-gray-300 group-hover:text-brand-400 mt-0.5 shrink-0 transition-colors">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </span>
        <p className="text-xs text-gray-500 italic leading-relaxed group-hover:text-brand-700 transition-colors">{quote}</p>
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 hover:bg-gray-100 transition-colors">
      <span className="text-gray-300 mt-0.5 shrink-0">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
      </span>
      <p className="text-xs text-gray-500 italic leading-relaxed">{quote}</p>
    </div>
  );
}
