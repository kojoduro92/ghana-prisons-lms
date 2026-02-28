import Image from "next/image";

interface CourseCardProps {
  title: string;
  subtitle: string;
  progress: number;
  imageSrc?: string;
}

export function CourseCard({ title, subtitle, progress, imageSrc }: CourseCardProps) {
  return (
    <article className="course-card">
      <div className="course-card-image">
        {imageSrc ? (
          <Image src={imageSrc} alt={title} fill className="course-card-image-asset" sizes="(max-width: 760px) 100vw, 25vw" />
        ) : null}
      </div>
      <h4>{title}</h4>
      <p>{subtitle}</p>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
      <p className="course-footer">{progress}% complete</p>
    </article>
  );
}
