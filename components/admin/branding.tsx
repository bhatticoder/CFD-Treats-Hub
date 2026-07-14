"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Campus } from "@/lib/types/models";

export function Branding({ campus }: { campus: Campus }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(campus?.logo_url ?? null);
  const [color, setColor] = useState(campus?.theme_color ?? "");
  const [account, setAccount] = useState(campus?.payment_account_info ?? "");
  const [codCap, setCodCap] = useState(String(campus?.cod_cap_percent ?? 100));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    try {
      const payload: Record<string, unknown> = {
        theme_color: color.trim() || null,
        payment_account_info: account.trim() || null,
        cod_cap_percent: Math.min(100, Math.max(0, Number(codCap) || 100)),
      };
      if (file) {
        const path = `logos/${crypto.randomUUID()}.png`;
        const { error: upErr } = await supabase.storage
          .from("item-images")
          .upload(path, file, { contentType: file.type || "image/png" });
        if (upErr) throw upErr;
        payload.logo_url = supabase.storage.from("item-images").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("campuses").update(payload).eq("id", campus.id);
      if (error) throw error;
      setMsg("Saved");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer max="max-w-xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Branding</h1>
      <p className="mb-5 text-sm text-text-muted">{campus?.name}</p>

      <Card>
        <CardBody className="space-y-5">
          <div>
            <Label>App logo</Label>
            <label className="grid h-32 w-32 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-bg-muted">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm text-text-faint">+ Logo</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f) setPreview(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>
          <div>
            <Label>Theme colour (hex)</Label>
            <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#5FA80B" />
          </div>
          <div>
            <Label>Payment account (shown to customers at checkout)</Label>
            <Input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="JazzCash 0300-1234567 (Muhammad Asaad)"
            />
          </div>
          <div>
            <Label>COD cap (% of nightly orders)</Label>
            <Input
              inputMode="numeric"
              value={codCap}
              onChange={(e) => setCodCap(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          {msg && <p className="text-sm text-text-muted">{msg}</p>}
          <Button className="w-full" loading={busy} onClick={save}>Save branding</Button>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
