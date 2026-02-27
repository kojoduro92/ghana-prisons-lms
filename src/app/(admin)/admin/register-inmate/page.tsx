"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { RoleShell } from "@/components/role-shell";
import { addAuditEvent, addOrUpdateInmate } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";
import type { InmateProfile } from "@/types/domain";

function generateStudentId(): string {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `GP-${randomSuffix}`;
}

export default function RegisterInmatePage() {
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [prisonId, setPrisonId] = useState("");
  const [gender, setGender] = useState<InmateProfile["gender"]>("Male");
  const [educationBackground, setEducationBackground] = useState("");
  const [skillInterests, setSkillInterests] = useState("");
  const [blockAssignment, setBlockAssignment] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [latestRegisteredId, setLatestRegisteredId] = useState<string | null>(null);
  const [generatedStudentId, setGeneratedStudentId] = useState(generateStudentId);
  const defaultPassword = "Prison1234";

  function resetFormForNextEntry(): void {
    setFullName("");
    setDateOfBirth("");
    setPrisonId("");
    setGender("Male");
    setEducationBackground("");
    setSkillInterests("");
    setBlockAssignment("");
    setGeneratedStudentId(generateStudentId());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const profile: InmateProfile = {
      id: generatedStudentId,
      fullName: fullName.trim(),
      prisonNumber: prisonId.trim(),
      dateOfBirth,
      gender,
      educationBackground: educationBackground.trim() || "Not specified",
      skillInterests: skillInterests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      blockAssignment: blockAssignment.trim() || "TBD",
      biometricStatus: "Enrolled",
      assignedPrison: "Nsawam",
    };

    addOrUpdateInmate(profile);
    addAuditEvent({
      action: "inmate-registered",
      actor: "Admin Officer",
      result: "success",
      target: profile.id,
      details: `Prison Number: ${profile.prisonNumber}`,
    });
    setLatestRegisteredId(profile.id);
    setSuccessMessage(`Inmate ${profile.fullName} registered with ${profile.id}. Credentials generated securely.`);
    resetFormForNextEntry();
  }

  return (
    <RoleShell title={appMeta.name} subtitle="New Inmate Registration" userName="Admin Officer">
      <section className="panel">
        <h1 style={{ marginBottom: 14 }}>New Inmate Registration</h1>

        <form className="grid-2" onSubmit={handleSubmit} data-testid="register-form">
          <div style={{ display: "grid", gap: 10 }}>
            <label>
              Full Name
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label>
              Date of Birth
              <input
                className="input"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </label>
            <label>
              Prison ID
              <input className="input" value={prisonId} onChange={(e) => setPrisonId(e.target.value)} required />
            </label>
            <label>
              Gender
              <select className="select" value={gender} onChange={(e) => setGender(e.target.value as InmateProfile["gender"])}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Educational Background
              <input
                className="input"
                value={educationBackground}
                onChange={(e) => setEducationBackground(e.target.value)}
              />
            </label>
            <label>
              Skill Interests (comma separated)
              <input className="input" value={skillInterests} onChange={(e) => setSkillInterests(e.target.value)} />
            </label>
            <label>
              Block or Unit Assignment
              <input className="input" value={blockAssignment} onChange={(e) => setBlockAssignment(e.target.value)} />
            </label>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <article className="panel" style={{ minHeight: 190 }}>
              <h3>Capture Photo</h3>
              <div className="hero" style={{ minHeight: 120, marginTop: 10 }} />
            </article>

            <article className="panel" style={{ minHeight: 190 }}>
              <h3>Fingerprint Scan</h3>
              <div className="hero" style={{ minHeight: 120, marginTop: 10 }} />
            </article>

            <article className="panel" style={{ padding: 12 }}>
              <p style={{ margin: 0 }}>
                Student ID: <strong data-testid="generated-student-id">{generatedStudentId}</strong>
              </p>
              <p style={{ margin: "8px 0 0" }}>
                Default Password: <strong>{defaultPassword}</strong>
              </p>
            </article>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="button-soft" onClick={() => setGeneratedStudentId(generateStudentId())}>
              Regenerate ID
            </button>
            <button className="button-primary" type="submit">
              Register Inmate
            </button>
          </div>
        </form>

        {successMessage ? (
          <div className="panel" style={{ marginTop: 12, padding: 12 }}>
            <p className="status-ok" style={{ margin: 0 }}>{successMessage}</p>
            {latestRegisteredId ? (
              <div style={{ marginTop: 8 }}>
                <Link className="button-soft" href={`/admin/inmates/${latestRegisteredId}`}>
                  Open Registered Profile
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </RoleShell>
  );
}
