export default function InsightSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl border border-line" style={{ background: '#FAFAFA' }}>
          <div className="shimmer h-3.5 rounded mb-2.5" style={{ width: `${60 + (i % 3) * 15}%` }}/>
          <div className="shimmer h-2.5 rounded mb-1.5 w-full"/>
          <div className="shimmer h-2.5 rounded" style={{ width: '80%' }}/>
        </div>
      ))}
    </div>
  );
}
