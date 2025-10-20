'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SalesRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/sales/dashboard");
  }, [router]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900"></div>
      </div>
    </main>
  );
}
