interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <section className="chart-card">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}
