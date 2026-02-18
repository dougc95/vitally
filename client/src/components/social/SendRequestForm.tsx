import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SendRequestFormProps {
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function SendRequestForm({
  email,
  onEmailChange,
  onSubmit,
  isSubmitting,
}: SendRequestFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Send friend request</CardTitle>
        <CardDescription>Invite a friend by account email.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Input
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            type="email"
          />
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
