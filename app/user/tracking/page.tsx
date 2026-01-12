"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OrderHistorySection from "@/components/user-components/user-dashboard-components/OrderHistorySection";

import { useUserProfile } from "../_components/UserProfileContext";

export default function TrackingPage() {
  const { user, loadingUser, profileError } = useUserProfile();

  if (loadingUser) {
    return <p className="text-center text-muted-foreground">Loading account...</p>;
  }

  if (!user) {
    return <p className="text-center text-muted-foreground">{profileError ?? "No user data found."}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">Order Tracking</h2>
        <p className="text-muted-foreground">Track your orders and delivery status</p>
      </div>

      <div className="bg-card p-8 rounded-lg border max-w-2xl mx-auto">
        <h3 className="text-xl font-semibold mb-4 text-center text-foreground">Track Your Order</h3>
        <div className="flex gap-2 flex-col sm:flex-row">
          <Input placeholder="Enter order ID or tracking number" className="flex-1" />
          <Button onClick={() => window.alert("Tracking is demo-only.")}>Track Order</Button>
        </div>
      </div>

      <OrderHistorySection userId={user.id} />
    </div>
  );
}
