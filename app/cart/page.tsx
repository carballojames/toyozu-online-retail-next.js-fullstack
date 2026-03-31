import { Suspense } from "react";

import UserShoppingCart from "@/pages/user-pages/user-dashboard/UserShoppingCart";

export default function CartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary-background" />}>
      <UserShoppingCart />
    </Suspense>
  );
}
