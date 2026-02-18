import type { FriendshipWithProfiles } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Ban, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FriendRequestCardProps {
  request: FriendshipWithProfiles;
  direction: "incoming" | "outgoing";
  onAccept?: (requestId: number) => void;
  onDecline?: (requestId: number) => void;
  onBlock?: (requestId: number) => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
  isBlocking?: boolean;
}

export function FriendRequestCard({
  request,
  direction,
  onAccept,
  onDecline,
  onBlock,
  isAccepting,
  isDeclining,
  isBlocking,
}: FriendRequestCardProps) {
  const profile =
    direction === "incoming" ? request.requester : request.addressee;

  return (
    <div className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{profile.displayName}</p>
        <p className="text-xs text-muted-foreground">
          Sent {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
        </p>
      </div>

      {direction === "incoming" ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAccept?.(request.id)}
            disabled={isAccepting || !onAccept}
          >
            {isAccepting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecline?.(request.id)}
            disabled={isDeclining || !onDecline}
          >
            {isDeclining ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => onBlock?.(request.id)}
            disabled={isBlocking || !onBlock}
          >
            {isBlocking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
          </Button>
        </div>
      ) : (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {request.status}
        </p>
      )}
    </div>
  );
}
