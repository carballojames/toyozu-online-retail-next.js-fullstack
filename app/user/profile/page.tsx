"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { useUserProfile } from "../_components/UserProfileContext";

export default function ProfilePage() {
  const { user, loadingUser, profileError, uploadProfilePicture } = useUserProfile();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleSaveProfile = () => {
    window.alert("Profile updates are mock-only for now.");
  };

  const handleSendPhoneCode = () => {
    window.alert("Mock: verification code sent.");
  };

  const handleVerifyPhone = () => {
    if (!phoneCode.trim()) {
      window.alert("Enter the verification code first.");
      return;
    }
    window.alert("Mock: phone verified.");
  };

  const handlePasswordChange = () => {
    window.alert("For security, password changes are handled via a secure reset flow.");
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg border">
        <div className="flex items-center mb-6">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mr-6 overflow-hidden relative group"
                aria-label="Change profile picture"
              >
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
                <span className="absolute inset-0 bg-black/40 text-white text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  Change
                </span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update profile picture</DialogTitle>
                <DialogDescription>Select a new image to use as your profile picture.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Choose Image
                  </Button>
                  <span className="text-sm text-muted-foreground">{file?.name ?? "No file selected"}</span>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpload} disabled={uploading || !file}>
                  {uploading ? "Uploading..." : "Save Photo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div>
            <h3 className="text-2xl font-semibold text-foreground">{user.user_name}</h3>

          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3">
            <Label>Email Address</Label>
            <Input
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder={user.email || "Email"}
            />
            <Label>Username</Label>
            <Input
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(e.target.value)}
              placeholder={user.username || "Username"}
            />
            <Label>Phone Number</Label>
            <Input
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder={user.mobile_phone || "Phone number"}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={handleSaveProfile}>Save Changes</Button>
            <Button variant="outline" onClick={handlePasswordChange}>
              Change Password
            </Button>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="text-sm font-medium text-foreground">Phone Verification (mock)</div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="Enter verification code"
                className="sm:max-w-[220px]"
              />
              <Button variant="outline" onClick={handleSendPhoneCode}>
                Send Code
              </Button>
              <Button onClick={handleVerifyPhone}>Verify</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
