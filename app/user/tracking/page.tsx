"use client";

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

      </div>
      <OrderHistorySection userId={user.id} mode="tracking" />
    </div>
  );
}
