type MetricCardProps = {
  title: string;
  value: string;
  description: string;
};

export function MetricCard({
  title,
  value,
  description,
}: MetricCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </article>
  );
}