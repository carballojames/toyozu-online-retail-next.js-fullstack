"use client";

import AddressSection from "@/components/user-components/user-dashboard-components/AddressSection";
import { useUserProfile } from "../_components/UserProfileContext";

export default function AddressesPage() {
  const { user, loadingUser, profileError } = useUserProfile();

  if (loadingUser) {
    return <p className="text-center text-muted-foreground">Loading account...</p>;
  }

  if (!user) {
    return <p className="text-center text-muted-foreground">{profileError ?? "No user data found."}</p>;
  }

  return <AddressSection />;
}
