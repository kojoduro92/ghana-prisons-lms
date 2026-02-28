import Image from "next/image";

interface BrandLogoProps {
  size?: number;
  priority?: boolean;
  className?: string;
}

export function BrandLogo({ size = 52, priority = false, className }: BrandLogoProps) {
  const rootClassName = className ? `brand-logo ${className}` : "brand-logo";

  return (
    <span className={rootClassName} style={{ width: size, height: size }}>
      <Image
        src="/assets/branding/ghana-prisons-logo.png"
        alt="Ghana Prisons Service logo"
        width={size}
        height={size}
        className="brand-logo-image"
        priority={priority}
      />
    </span>
  );
}
