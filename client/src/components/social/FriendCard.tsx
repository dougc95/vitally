import type { SocialProfile } from "@shared/schema";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FriendCardProps {
  friend: SocialProfile;
  onRemove: (friendPatientId: number) => void;
  isRemoving?: boolean;
}

export function FriendCard({ friend, onRemove, isRemoving }: FriendCardProps) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-sm text-foreground">{friend.displayName}</p>
          <p className="text-xs text-muted-foreground">Patient #{friend.patientId}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => onRemove(friend.patientId)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          Remove
        </Button>
      </CardContent>
    </Card>
  );
}
