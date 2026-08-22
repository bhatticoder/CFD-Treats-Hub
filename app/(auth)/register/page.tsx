"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { GENDERS } from "@/lib/domain/constants";
import { validatePhone, validateRoom } from "@/lib/domain/validators";
import type { Campus } from "@/lib/types/models";

export default function RegisterPage() {
  const router = useRouter();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string>("");
  const [campusId, setCampusId] = useState<string>("");
  const [block, setBlock] = useState<string>("");
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.replace("/login");
      setEmail(userData.user.email ?? "");
      const { data } = await supabase
        .from("campuses")
        .select("*")
        .eq("is_active", true)
        .order("name");
      setCampuses((data as Campus[]) ?? []);
    })();
  }, [router]);

  // Allow user to see all campuses. Validation handles domains.

  async function submit() {
    setError(null);
    const pErr = validatePhone(phone);
    if (!name.trim()) return setError("Enter your full name");
    if (pErr) return setError(pErr);
    if (!gender) return setError("Select your gender");
    const selectedCampus = campuses.find((c) => c.id === campusId);
    if (selectedCampus?.domain_suffix && !email.toLowerCase().endsWith(selectedCampus.domain_suffix.toLowerCase())) {
      if (email.toLowerCase().endsWith("@cfd.nu.edu.pk")) {
        // Allow valid cfd.nu.edu.pk email to pass
      } else {
        return setError("Email must end with @cfd.nu.edu.pk");
      }
    }
    const rErr = validateRoom(room);
    if (rErr) return setError(rErr);

    setLoading(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setLoading(false);
      return router.replace("/login");
    }
    const effectiveCampusId = campusId;
    
    const isGirlsCampus = selectedCampus?.gender === "Female";
    
    // Dynamic block resolution based on halls
    let finalBlock = block;
    if (selectedCampus?.halls && selectedCampus.halls.length === 1) {
      finalBlock = selectedCampus.halls[0];
    } else if (!finalBlock) {
      finalBlock = "Main"; // fallback
    }

    const { error } = await supabase.from("profiles").insert({
      id: uid,
      email,
      full_name: name.trim(),
      phone: phone.trim(),
      gender,
      campus_id: effectiveCampusId,
      block: finalBlock,
      room_number: room.trim(),
      role: "customer",
      is_active: true,
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="p-7">
        <h1 className="text-xl font-extrabold text-text">Complete your profile</h1>
        <p className="mb-4 text-sm text-text-muted">{email}</p>

        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              inputMode="tel"
              placeholder="03XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label>Gender</Label>
            <Select
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                setCampusId("");
              }}
            >
              <option value="">Select…</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Campus / Hostel</Label>
            <Select
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
            >
              <option value="">
                Select…
              </option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className={`grid ${(!campuses.find(c => c.id === campusId)?.halls || campuses.find(c => c.id === campusId)!.halls!.length <= 1) ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
            {(campuses.find((c) => c.id === campusId)?.halls?.length ?? 0) > 1 && (
              <div>
                <Label>Block / Hall</Label>
                <Select value={block} onChange={(e) => setBlock(e.target.value)}>
                  <option value="">Select...</option>
                  {campuses.find((c) => c.id === campusId)?.halls?.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Room no.</Label>
              <Input
                inputMode="numeric"
                value={room}
                onChange={(e) =>
                  setRoom(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <Button className="mt-5 w-full" size="lg" loading={loading} onClick={submit}>
          Create account
        </Button>
      </CardBody>
    </Card>
  );
}
