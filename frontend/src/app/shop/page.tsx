import { Suspense } from "react";
import ShopClient from "./shop-client";

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 text-sm text-muted-foreground">Chargement…</div>}>
      <ShopClient />
    </Suspense>
  );
}
