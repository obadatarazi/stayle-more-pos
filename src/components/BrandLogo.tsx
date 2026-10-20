import { site } from "@/config/site";

export default function BrandLogo({
  className = "h-14 w-auto object-contain",
  rounded = true,
}: {
  className?: string;
  rounded?: boolean;
}) {
  return (
    <img
      src={site.logoSrc}
      alt={site.brandName}
      className={`${rounded ? "rounded-2xl" : ""} ${className}`}
    />
  );
}
