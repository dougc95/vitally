import type { FriendFeedItem as FriendFeedItemType } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface FeedItemProps {
  item: FriendFeedItemType;
}

function formatFeedEvent(item: FriendFeedItemType): string {
  const actor = item.actor.displayName;
  const habit = item.habit.title ?? "a habit";

  if (item.eventType === "habit_completed") {
    return `${actor} completed ${habit}`;
  }

  if (item.eventType === "habit_uncompleted") {
    return `${actor} unmarked ${habit}`;
  }

  return `${actor} created ${habit}`;
}

export function FeedItem({ item }: FeedItemProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-1">
          <p className="font-medium text-sm text-foreground">{formatFeedEvent(item)}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
