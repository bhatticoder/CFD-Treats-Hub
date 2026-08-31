"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import type { Campus } from "@/lib/types/models";

export function Branding({ campuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(campuses[0]?.id ?? "");
  const campus = campuses.find(c => c.id === selectedId);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(campus?.logo_url ?? null);
  const [color, setColor] = useState(campus?.theme_color ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    try {
      const payload: Record<string, unknown> = {
        theme_color: color.trim() || null,
      };
      if (file) {
        const path = `logos/${crypto.randomUUID()}.png`;
        const { error: upErr } = await supabase.storage
          .from("item-images")
          .upload(path, file, { contentType: file.type || "image/png" });
        if (upErr) throw new Error(upErr.message ?? String(upErr));
        const { data: urlData } = await supabase.storage.from("item-images").getPublicUrl(path);
        payload.logo_url = urlData.publicUrl;
      }
      const { error } = await supabase.from("campuses").update(payload).eq("id", selectedId);
      if (error) throw new Error(error.message ?? String(error));
      setMsg("Saved");
      router.refresh();
    } catch (e) {
      // Supabase errors (PostgrestError) are plain objects with a `message` field,
      // not instanceof Error — extract message to avoid rendering [object Object]
      if (e && typeof e === "object" && "message" in e) {
        setMsg((e as { message: string }).message);
      } else if (e instanceof Error) {
        setMsg(e.message);
      } else {
        setMsg(String(e));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!campus) return <PageContainer><p>No campus found.</p></PageContainer>;

  return (
    <PageContainer max="max-w-xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Branding</h1>
      <p className="mb-5 text-sm text-text-muted">Customize your app appearance.</p>

      {campuses.length > 1 && (
        <div className="mb-6">
          <Label>Select Campus</Label>
          <Select 
            value={selectedId} 
            onChange={(e) => {
              const id = e.target.value;
              setSelectedId(id);
              const c = campuses.find(x => x.id === id);
              if (c) {
                setPreview(c.logo_url ?? null);
                setColor(c.theme_color ?? "");
                setFile(null);
              }
            }} 
            className="w-full sm:w-72"
          >
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      )}

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
          {msg && <p className="text-sm text-text-muted">{msg}</p>}
          <Button className="w-full" loading={busy} onClick={save}>Save branding</Button>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
