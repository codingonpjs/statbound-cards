import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getProfile } from "@/lib/player.functions";

export function useProfile() {
  const fetchProfile = useServerFn(getProfile);
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
    staleTime: 5_000,
  });
}

export function useRefreshGame() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
    void queryClient.invalidateQueries({ queryKey: ["collection"] });
    void queryClient.invalidateQueries({ queryKey: ["opponents"] });
  };
}
