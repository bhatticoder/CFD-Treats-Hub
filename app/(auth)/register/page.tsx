"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { firebaseAuth, firebaseDb } from "@/lib/firebase/config";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";
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
    // Get the current user from Firebase Auth
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        setEmail(user.email || "");
      }
    });

    (async () => {
      try {
        const q = query(collection(firebaseDb, "campuses"), where("is_active", "==", true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Campus[];
        data.sort((a, b) => a.name.localeCompare(b.name));
        setCampuses(data);
      } catch (err) {
        console.error("Failed to load campuses", err);
      }
    })();

    return () => unsubscribe();
  }, [router]);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Enter your full name");
    
    const pErr = validatePhone(phone);
    if (pErr) return setError(pErr);
    if (!gender) return setError("Select your gender");
    
    const selectedCampus = campuses.find((c) => c.id === campusId);
    if (!selectedCampus) return setError("Select a campus");

    if (selectedCampus.domain_suffix && !email.toLowerCase().endsWith(selectedCampus.domain_suffix.toLowerCase())) {
      if (!email.toLowerCase().endsWith("@cfd.nu.edu.pk")) {
        return setError(`Email must end with ${selectedCampus.domain_suffix}`);
      }
    }
    
    const rErr = validateRoom(room);
    if (rErr) return setError(rErr);

    setLoading(true);

    let finalBlock = block;
    if (selectedCampus?.halls && selectedCampus.halls.length === 1) {
      finalBlock = selectedCampus.halls[0];
    } else if (!finalBlock) {
      finalBlock = "Main";
    }

    try {
      const user = firebaseAuth.currentUser;
      if (!user) {
        throw new Error("No authenticated user found. Please login again.");
      }

      // Create Firestore Profile
      await setDoc(doc(firebaseDb, "profiles", user.uid), {
        id: user.uid,
        email: email.trim().toLowerCase(),
        full_name: name.trim(),
        phone: phone.trim(),
        gender,
        campus_id: campusId,
        block: finalBlock,
        room_number: room.trim(),
        role: "customer",
        is_active: true,
        created_at: new Date().toISOString()
      });

      router.replace("/");
      router.refresh();
      
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const errorObj = err as { message: string };
      setError(errorObj.message || "Failed to complete registration.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardBody className="p-7">
        <div className="flex items-start gap-3 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-text leading-tight">Complete your profile</h1>
            <p className="text-sm text-text-muted mt-0.5">{email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
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
          Complete Profile
        </Button>
      </CardBody>
    </Card>
  );
}
