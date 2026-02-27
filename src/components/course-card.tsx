interface CourseCardProps {
  title: string;
  subtitle: string;
  progress: number;
}

export function CourseCard({ title, subtitle, progress }: CourseCardProps) {
  return (
    <article className="course-card">
      <div className="course-card-image" />
      <h4>{title}</h4>
      <p>{subtitle}</p>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
      <p className="course-footer">{progress}% complete</p>
    </article>
  );
}
