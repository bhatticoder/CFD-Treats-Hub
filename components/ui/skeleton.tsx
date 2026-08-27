import { PageContainer } from "@/components/app-shell";
import { cn } from "@/lib/utils";

/** A single shimmering placeholder block. */
export function Skel({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-border/50", className)}
    />
  );
}

function Header() {
  return (
    <div className="mb-6 space-y-2">
      <Skel className="h-7 w-48" />
      <Skel className="h-4 w-32" />
    </div>
  );
}

/** Menu / product grid (customer home, pre-order). */
export function MenuGridSkeleton() {
  return (
    <PageContainer>
      <Header />
      <div className="mb-5 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skel key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <Skel className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skel className="h-4 w-3/4" />
              <Skel className="h-4 w-1/3" />
              <Skel className="h-9 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

/** Stacked list of cards (orders, managers, inventory, notifications…). */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <PageContainer max="max-w-3xl">
      <Header />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            <Skel className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skel className="h-4 w-1/2" />
              <Skel className="h-3 w-1/3" />
            </div>
            <Skel className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

/** Dashboard stat cards. */
export function DashboardSkeleton() {
  return (
    <PageContainer>
      <Header />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5">
            <Skel className="mb-3 h-7 w-7 rounded-md" />
            <Skel className="mb-2 h-7 w-24" />
            <Skel className="h-4 w-20" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

/** Single-column form / detail. */
export function FormSkeleton() {
  return (
    <PageContainer max="max-w-xl">
      <Header />
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skel className="h-4 w-24" />
            <Skel className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
