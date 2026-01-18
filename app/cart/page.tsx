import ShoppingCart from "../../user-pages/shopping-cart";
import { Suspense } from "react";

export default function CartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-primary-background" />}>
      <ShoppingCart />
    </Suspense>
  );
}
