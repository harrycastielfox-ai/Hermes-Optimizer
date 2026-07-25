type NexProgressRingProps = {
  progress: number;
  compact?: boolean;
};

export function NexProgressRing({ progress, compact = false }: NexProgressRingProps) {
  const normalized = Math.min(100, Math.max(0, Math.round(progress)));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div
      className={`nex-progress-ring${compact ? " nex-progress-ring--compact" : ""}`}
      aria-label={`${normalized}% concluído`}
    >
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <circle className="nex-progress-ring__track" cx="55" cy="55" r={radius} />
        <circle
          className="nex-progress-ring__value"
          cx="55"
          cy="55"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <strong>{normalized}%</strong>
      {!compact && <span>concluído</span>}
    </div>
  );
}
