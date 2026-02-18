import type { SocialPrivacySettings } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PrivacyFormProps {
  settings?: SocialPrivacySettings;
  isLoading?: boolean;
  isUpdating?: boolean;
  onToggleShareHabitActivity: (checked: boolean) => void;
  onToggleShowHabitName: (checked: boolean) => void;
}

export function PrivacyForm({
  settings,
  isLoading,
  isUpdating,
  onToggleShareHabitActivity,
  onToggleShowHabitName,
}: PrivacyFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Habit activity sharing</CardTitle>
        <CardDescription>
          Control what your friends can see in their feed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !settings ? (
          <p className="text-sm text-destructive">Failed to load privacy settings.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="shareHabitActivity">Share habit activity</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When off, your friends cannot see your habit feed events.
                </p>
              </div>
              <Switch
                id="shareHabitActivity"
                checked={settings.shareHabitActivity}
                onCheckedChange={onToggleShareHabitActivity}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="showHabitName">Show habit name</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When off, events appear as generic habit activity.
                </p>
              </div>
              <Switch
                id="showHabitName"
                checked={settings.showHabitName}
                onCheckedChange={onToggleShowHabitName}
                disabled={isUpdating}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
