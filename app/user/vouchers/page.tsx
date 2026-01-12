"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useUserProfile } from "../_components/UserProfileContext";

export default function VouchersPage() {
  const { user, loadingUser, profileError } = useUserProfile();

  if (loadingUser) {
    return <p className="text-center text-muted-foreground">Loading account...</p>;
  }

  if (!user) {
    return <p className="text-center text-muted-foreground">{profileError ?? "No user data found."}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Vouchers</h2>
        <Button onClick={() => window.alert("Demo only")}>Browse Offers</Button>
      </div>

      <div className="bg-card p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Redeem Voucher Code</h3>
        <div className="flex gap-4">
          <Input placeholder="Enter voucher code" className="flex-1" />
          <Button onClick={() => window.alert("Demo only")}>Redeem</Button>
        </div>
      </div>
    </div>
  );
}
