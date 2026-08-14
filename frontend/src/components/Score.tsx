interface ScoreProps {
  correct: number;
  total: number;
}

export default function Score({ correct, total }: ScoreProps) {
  return (
    <div className="font-mono text-lg font-semibold text-gray-700 tabular-nums">
      {correct}/{total}
    </div>
  );
}
