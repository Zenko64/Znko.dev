import { assertOk, client } from "@/lib/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type InferRequestType } from "hono/client";
export const profilesQueryKey = ["profiles"] as const;

type ProfilePatchInput = InferRequestType<
  typeof client.api.auth.profile.$patch
>["json"];

export const accountKey = ["account"] as const;
export const profileKey = (username: string) => ["profile", username] as const;

async function fetchProfile(username: string) {
  const response = await client.api.profiles[":username"].$get({
    param: { username },
  });
  await assertOk(response);
  return await response.json();
}

export function useProfileQuery(username: string) {
  return useQuery({
    queryFn: () => fetchProfile(username),
    queryKey: profileKey(username),
  });
}

export function useProfileUpdateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProfilePatchInput) => {
      const response = await client.api.auth.profile.$patch({
        json: data,
      });
      assertOk(response);
      return await response.json();
    },
    onSuccess: (data) => {
      qc.setQueryData(accountKey, data); // Update account cache with new profile data.
    },
  });
}
