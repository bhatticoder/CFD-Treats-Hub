"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

/** Compose + broadcast a notification to the campus (manager or admin). */
export function SendNotify({ campusId }: { campusId: string }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    if (!title.trim() || !message.trim()) return;
    setBusy(true);
    setMsg(null);
    const { error } = await createClient().from("notifications").insert({
      campus_id: campusId,
      title: title.trim(),
      message: message.trim(),
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setTitle("");
    setMessage("");
    setMsg("Sent to all customers on your campus ✓");
  }

  return (
    <PageContainer max="max-w-lg">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-text">
        <Megaphone className="h-6 w-6 text-primary" /> Send Notification
      </h1>
      <p className="mb-5 text-sm text-text-muted">Broadcast a message to customers on your campus.</p>
      <Card>
        <CardBody className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fresh batch arrived!" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          {msg && <p className="text-sm text-text-muted">{msg}</p>}
          <Button className="w-full" loading={busy} onClick={send}>Send</Button>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
