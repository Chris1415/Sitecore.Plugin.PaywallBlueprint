import { cn } from "@/lib/utils";

// bg-foreground/15 — 15% of the foreground token yields dark-on-light in
// light mode and light-on-dark in dark mode, equally visible in both. The
// stock `bg-muted` resolved to near-white in light mode (Blok Nova maps
// --muted to gray-50), which disappeared on white cards.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-foreground/15", className)}
      {...props}
    />
  );
}

export { Skeleton };
