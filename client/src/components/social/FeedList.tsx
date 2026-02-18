import type { FriendFeedItem } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeedItem } from "./FeedItem";

interface FeedListProps {
  items: FriendFeedItem[];
  isLoading?: boolean;
  isError?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function FeedList({
  items,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: FeedListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">
          Failed to load feed.
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No activity yet</CardTitle>
          <CardDescription>
            Add friends and complete habits to see updates here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {items.map((item) => (
        <FeedItem key={item.id} item={item} />
      ))}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </>
  );
}
