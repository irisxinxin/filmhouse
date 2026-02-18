import Image from 'next/image';
import Link from 'next/link';

type LogoProps = {
  href?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
};

export function Logo({
  href = '/',
  priority = false,
  className = '',
  imageClassName = 'h-7 w-auto',
  width = 120,
  height = 62,
}: LogoProps) {
  return (
    <Link href={href} className={className} aria-label="Filmhouse">
      <Image
        src="/brand/filmhouse-logo-white.png"
        alt="Filmhouse"
        width={width}
        height={height}
        priority={priority}
        className={imageClassName}
      />
    </Link>
  );
}
