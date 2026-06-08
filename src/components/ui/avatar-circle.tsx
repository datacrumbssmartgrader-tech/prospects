export function AvatarCircle({
  src,
  name,
  size = 32,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-semibold shrink-0 select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </div>
  );
}
