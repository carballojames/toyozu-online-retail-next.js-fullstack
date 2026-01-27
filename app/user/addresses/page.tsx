"use client";

import AddressSection from "@/components/user-components/user-dashboard-components/AddressSection";
import { Spinner } from "@/components/ui/spinner";
import { useUserProfile } from "../_components/UserProfileContext";

export default function AddressesPage() {
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

  return <AddressSection userId={user.id} />;
}
