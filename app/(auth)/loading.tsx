// app/(auth)/loading.tsx
// Loading skeleton shown while auth pages are fetching data.

import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="w-full max-w-md space-y-4" aria-label="Loading...">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-2/3 rounded-lg" />
    </div>
  );
}
