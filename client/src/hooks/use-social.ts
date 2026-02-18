import type { InfiniteData } from "@tanstack/react-query";
import type {
  FriendFeedResponse,
  FriendRequestsResponse,
  FriendshipWithProfiles,
  SendFriendRequestRequest,
  SocialPrivacySettings,
  SocialProfile,
  UpdateSocialPrivacySettingsRequest,
} from "@shared/schema";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

const DEFAULT_FEED_LIMIT = 25;

type RawFriendship = Omit<
  FriendshipWithProfiles,
  "createdAt" | "respondedAt"
> & {
  createdAt: string | Date;
  respondedAt: string | Date | null;
};

type RawFriendRequests = {
  incoming?: RawFriendship[];
  outgoing?: RawFriendship[];
};

type RawSocialPrivacySettings = Omit<SocialPrivacySettings, "updatedAt"> & {
  updatedAt: string | Date;
};

function normalizeFriendship(data: RawFriendship): FriendshipWithProfiles {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    respondedAt: data.respondedAt ? new Date(data.respondedAt) : null,
  };
}

function normalizeFriendRequests(
  data?: RawFriendRequests,
): FriendRequestsResponse {
  return {
    incoming: Array.isArray(data?.incoming)
      ? data.incoming.map((request: RawFriendship) =>
          normalizeFriendship(request),
        )
      : [],
    outgoing: Array.isArray(data?.outgoing)
      ? data.outgoing.map((request: RawFriendship) =>
          normalizeFriendship(request),
        )
      : [],
  };
}

function normalizeSocialPrivacySettings(
  data: RawSocialPrivacySettings,
): SocialPrivacySettings {
  return {
    ...data,
    updatedAt: new Date(data.updatedAt),
  };
}

function buildFeedUrl(
  cursor?: string,
  limit: number = DEFAULT_FEED_LIMIT,
): string {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  if (cursor) {
    params.set("cursor", cursor);
  }

  return `${api.social.feed.list.path}?${params.toString()}`;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const error = await res.json();
    return error.message || "Request failed";
  } catch {
    return "Request failed";
  }
}

export function useFriendRequests() {
  return useQuery<FriendRequestsResponse>({
    queryKey: [api.social.friends.requests.list.path],
    queryFn: async () => {
      const res = await fetch(api.social.friends.requests.list.path, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const data: RawFriendRequests = await res.json();
      return normalizeFriendRequests(data);
    },
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation<FriendshipWithProfiles, Error, SendFriendRequestRequest>({
    mutationFn: async (data) => {
      const res = await fetch(api.social.friends.requests.create.path, {
        method: api.social.friends.requests.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const response: RawFriendship = await res.json();
      return normalizeFriendship(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.social.friends.requests.list.path],
      });
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation<FriendshipWithProfiles, Error, number>({
    mutationFn: async (requestId) => {
      const url = buildUrl(api.social.friends.requests.accept.path, {
        id: requestId,
      });
      const res = await fetch(url, {
        method: api.social.friends.requests.accept.method,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const response: RawFriendship = await res.json();
      return normalizeFriendship(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.social.friends.requests.list.path],
      });
      queryClient.invalidateQueries({
        queryKey: [api.social.friends.list.path],
      });
    },
  });
}

export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation<FriendshipWithProfiles, Error, number>({
    mutationFn: async (requestId) => {
      const url = buildUrl(api.social.friends.requests.decline.path, {
        id: requestId,
      });
      const res = await fetch(url, {
        method: api.social.friends.requests.decline.method,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const response: RawFriendship = await res.json();
      return normalizeFriendship(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.social.friends.requests.list.path],
      });
      queryClient.invalidateQueries({
        queryKey: [api.social.friends.list.path],
      });
    },
  });
}

export function useBlockFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation<FriendshipWithProfiles, Error, number>({
    mutationFn: async (requestId) => {
      const url = buildUrl(api.social.friends.requests.block.path, {
        id: requestId,
      });
      const res = await fetch(url, {
        method: api.social.friends.requests.block.method,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const response: RawFriendship = await res.json();
      return normalizeFriendship(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.social.friends.requests.list.path],
      });
      queryClient.invalidateQueries({
        queryKey: [api.social.friends.list.path],
      });
      queryClient.invalidateQueries({ queryKey: [api.social.feed.list.path] });
    },
  });
}

export function useFriendsList() {
  return useQuery<SocialProfile[]>({
    queryKey: [api.social.friends.list.path],
    queryFn: async () => {
      const res = await fetch(api.social.friends.list.path, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const response: SocialProfile[] = await res.json();
      return response;
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (friendPatientId) => {
      const url = buildUrl(api.social.friends.remove.path, { friendPatientId });
      const res = await fetch(url, {
        method: api.social.friends.remove.method,
        credentials: "include",
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(await readErrorMessage(res));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.social.friends.list.path],
      });
      queryClient.invalidateQueries({ queryKey: [api.social.feed.list.path] });
    },
  });
}

export function useFriendFeed(limit: number = DEFAULT_FEED_LIMIT) {
  return useInfiniteQuery<
    FriendFeedResponse,
    Error,
    InfiniteData<FriendFeedResponse>,
    string[],
    string | undefined
  >({
    queryKey: [api.social.feed.list.path, String(limit)],
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      const cursor = typeof pageParam === "string" ? pageParam : undefined;
      const res = await fetch(buildFeedUrl(cursor, limit), {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const response: FriendFeedResponse = await res.json();
      return response;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useSocialPrivacySettings() {
  return useQuery<SocialPrivacySettings>({
    queryKey: [api.social.privacy.get.path],
    queryFn: async () => {
      const res = await fetch(api.social.privacy.get.path, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const response: RawSocialPrivacySettings = await res.json();
      return normalizeSocialPrivacySettings(response);
    },
  });
}

export function useUpdateSocialPrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation<
    SocialPrivacySettings,
    Error,
    UpdateSocialPrivacySettingsRequest
  >({
    mutationFn: async (data) => {
      const res = await fetch(api.social.privacy.update.path, {
        method: api.social.privacy.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }

      const response: RawSocialPrivacySettings = await res.json();
      return normalizeSocialPrivacySettings(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.social.privacy.get.path],
      });
      queryClient.invalidateQueries({ queryKey: [api.social.feed.list.path] });
    },
  });
}
