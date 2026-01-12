"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useUserProfile } from "../_components/UserProfileContext";

export default function ProfilePage() {
  const { user, loadingUser, profileError, uploadProfilePicture } = useUserProfile();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (loadingUser) {
    return <p className="text-center text-muted-foreground">Loading account...</p>;
  }

  if (!user) {
    return <p className="text-center text-muted-foreground">{profileError ?? "No user data found."}</p>;
  }

  const handleUpload = async () => {
    if (!file) {
      window.alert("Please select a file first.");
      return;
    }

    setUploading(true);
    try {
      const ok = await uploadProfilePicture(file);
      window.alert(ok ? "Profile picture updated." : "Upload failed");
      if (ok) setFile(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto bg-card p-8 rounded-lg border">
        <div className="flex items-center mb-6">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mr-6 overflow-hidden">
            {user.profile_picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profile_picture}
                alt="Profile picture"
                width={80}
                height={80}
                className="h-20 w-20 object-cover"
              />
            ) : (
              <span className="text-primary-foreground text-2xl font-bold">{user.user_name?.[0] || "?"}</span>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-foreground">{user.user_name}</h3>
            <p className="text-muted-foreground">Email: {user.email || "—"}</p>
            <p className="text-muted-foreground">Username: {user.username || "—"}</p>
            <p className="text-muted-foreground">Phone: {user.mobile_phone || "—"}</p>
            <p className="text-muted-foreground font-semibold">Role: {user.role_id || "—"}</p>
          </div>
        </div>

        <div className="space-y-3">
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Picture"}
          </Button>
        </div>
      </div>
    </div>
  );
}
