import type { FriendFeedResponse } from "@shared/schema";
import { useState } from "react";
import { Activity, Loader2, Shield, UserPlus, Users } from "lucide-react";
import {
  useAcceptFriendRequest,
  useBlockFriendRequest,
  useDeclineFriendRequest,
  useFriendFeed,
  useFriendRequests,
  useFriendsList,
  useRemoveFriend,
  useSendFriendRequest,
  useSocialPrivacySettings,
  useUpdateSocialPrivacySettings,
} from "@/hooks/use-social";
import { PageLayout } from "@/components/PageLayout";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FeedList,
  FriendCard,
  FriendRequestCard,
  PrivacyForm,
  SendRequestForm,
} from "@/components/social";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Friends() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const friendRequests = useFriendRequests();
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const blockRequest = useBlockFriendRequest();
  const friendsList = useFriendsList();
  const removeFriend = useRemoveFriend();
  const feed = useFriendFeed();
  const privacy = useSocialPrivacySettings();
  const updatePrivacy = useUpdateSocialPrivacySettings();

  const feedItems = (feed.data?.pages ?? []).flatMap(
    (page: FriendFeedResponse) => page.items,
  );
  const incoming = friendRequests.data?.incoming ?? [];
  const outgoing = friendRequests.data?.outgoing ?? [];

  const handleSendRequest = () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast({
        title: "Email required",
        description: "Enter an email to send a friend request.",
        variant: "destructive",
      });
      return;
    }

    sendRequest.mutate(
      { email: normalizedEmail },
      {
        onSuccess: () => {
          setEmail("");
          toast({ title: "Friend request sent" });
        },
        onError: (err) => {
          toast({
            title: "Request failed",
            description: err.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleToggleShareHabitActivity = (checked: boolean) => {
    updatePrivacy.mutate(
      { shareHabitActivity: checked },
      {
        onSuccess: () => {
          toast({ title: "Privacy updated" });
        },
        onError: (err) => {
          toast({
            title: "Update failed",
            description: err.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleToggleShowHabitName = (checked: boolean) => {
    updatePrivacy.mutate(
      { showHabitName: checked },
      {
        onSuccess: () => {
          toast({ title: "Privacy updated" });
        },
        onError: (err) => {
          toast({
            title: "Update failed",
            description: err.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <PageLayout
      title="Friends"
      subtitle="Follow friends' habit activity while keeping everything else private."
    >
      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feed" className="gap-2">
            <Activity className="w-4 h-4" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="friends" className="gap-2">
            <Users className="w-4 h-4" />
            Friends
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="w-4 h-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          <FeedList
            items={feedItems}
            isLoading={feed.isLoading}
            isError={feed.isError}
            hasNextPage={feed.hasNextPage}
            isFetchingNextPage={feed.isFetchingNextPage}
            onLoadMore={() => feed.fetchNextPage()}
          />
        </TabsContent>

        <TabsContent value="friends" className="space-y-4">
          {friendsList.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            </div>
          ) : friendsList.isError ? (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">
                Failed to load friends.
              </CardContent>
            </Card>
          ) : friendsList.data && friendsList.data.length > 0 ? (
            friendsList.data.map((friend) => (
              <FriendCard
                key={friend.patientId}
                friend={friend}
                isRemoving={removeFriend.isPending}
                onRemove={(friendPatientId) =>
                  removeFriend.mutate(friendPatientId, {
                    onSuccess: () => toast({ title: "Friend removed" }),
                    onError: (err) =>
                      toast({
                        title: "Failed to remove friend",
                        description: err.message,
                        variant: "destructive",
                      }),
                  })
                }
              />
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No friends yet</CardTitle>
                <CardDescription>
                  Send a friend request by email to get started.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <SendRequestForm
            email={email}
            onEmailChange={setEmail}
            onSubmit={handleSendRequest}
            isSubmitting={sendRequest.isPending}
          />

          <Card>
            <CardHeader>
              <CardTitle>Incoming requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {friendRequests.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : incoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending requests.
                </p>
              ) : (
                incoming.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    direction="incoming"
                    isAccepting={acceptRequest.isPending}
                    isDeclining={declineRequest.isPending}
                    isBlocking={blockRequest.isPending}
                    onAccept={(requestId) =>
                      acceptRequest.mutate(requestId, {
                        onSuccess: () => toast({ title: "Request accepted" }),
                        onError: (err) =>
                          toast({
                            title: "Failed to accept request",
                            description: err.message,
                            variant: "destructive",
                          }),
                      })
                    }
                    onDecline={(requestId) =>
                      declineRequest.mutate(requestId, {
                        onSuccess: () => toast({ title: "Request declined" }),
                        onError: (err) =>
                          toast({
                            title: "Failed to decline request",
                            description: err.message,
                            variant: "destructive",
                          }),
                      })
                    }
                    onBlock={(requestId) =>
                      blockRequest.mutate(requestId, {
                        onSuccess: () => toast({ title: "User blocked" }),
                        onError: (err) =>
                          toast({
                            title: "Failed to block user",
                            description: err.message,
                            variant: "destructive",
                          }),
                      })
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outgoing requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {outgoing.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No outgoing requests.
                </p>
              ) : (
                outgoing.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    direction="outgoing"
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <PrivacyForm
            settings={privacy.data}
            isLoading={privacy.isLoading}
            isUpdating={updatePrivacy.isPending}
            onToggleShareHabitActivity={handleToggleShareHabitActivity}
            onToggleShowHabitName={handleToggleShowHabitName}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
