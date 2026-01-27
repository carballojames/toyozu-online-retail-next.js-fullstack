"use client";

import OrderHistorySection from "@/components/user-components/user-dashboard-components/OrderHistorySection";
import { Spinner } from "@/components/ui/spinner";

import { useUserProfile } from "../_components/UserProfileContext";

export default function TrackingPage() {
  const { user, loadingUser, profileError } = useUserProfile();

  if (loadingUser) {
    return (
      <div className="flex justify-center p-10">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
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
