import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type UserProfile = {
  id: number;
  user_name: string;
  email?: string;
  username?: string;
  mobile_phone?: string;
  role_id?: number;
  profile_picture?: string | null;
};

function readUserIdFromStorage(): number {
  if (typeof window === "undefined") return NaN;
  const raw = localStorage.getItem("user_id");
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
}

export function useUserProfileQuery() {
  const userId = readUserIdFromStorage();

  return useQuery({
    queryKey: ["me-profile", userId],
    enabled: Number.isFinite(userId),
    queryFn: async (): Promise<UserProfile> => {
      const res = await fetch(`/api/me?userId=${encodeURIComponent(String(userId))}`);
      const json = (await res.json()) as { data?: UserProfile; error?: string };

      if (!res.ok || !json.data) {
        throw new Error(json.error || "Failed to load profile.");
      }

      return json.data;
    },
    retry: 1,
  });
}

export function useUploadProfilePictureMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, file }: { userId: number; file: File }) => {
      const formData = new FormData();
      formData.append("userId", String(userId));
      formData.append("file", file);

      const res = await fetch("/api/me/profile-picture", {
        method: "POST",
        body: formData,
      });

      const json = (await res.json()) as { data?: { profile_picture: string }; error?: string };
      if (!res.ok || !json.data?.profile_picture) {
        throw new Error(json.error || "Upload failed");
      }

      return json.data.profile_picture;
    },
    onSuccess: (profilePicture) => {
      queryClient.setQueryData<UserProfile | undefined>(["me-profile", readUserIdFromStorage()], (previous) => {
        if (!previous) return previous;
        return { ...previous, profile_picture: profilePicture };
      });
    },
  });
}
