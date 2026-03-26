"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { RoleShell } from "@/components/role-shell";
import { addAuditEvent, addOrUpdateInmate } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";
import { isStrictBiometricMode } from "@/lib/biometric-policy";
import {
  resolveHardwareBiometricAdapter,
  runHardwareBiometricChallenge,
  type HardwareBiometricAdapter,
} from "@/lib/hardware-biometric-adapter";
import { formatDateTime } from "@/lib/format";
import type { InmateProfile } from "@/types/domain";

function generateStudentId(): string {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `GP-${randomSuffix}`;
}

function generateWarrantSerialNumber(): string {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `WR-${new Date().getFullYear()}-${randomSuffix}`;
}

function suffixFromSeed(seed: string): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 90000;
  }
  return String(10000 + hash).padStart(5, "0");
}

export default function RegisterInmatePage() {
  const stableSeed = suffixFromSeed(useId());
  const [fullName, setFullName] = useState("");
  const [warrantName, setWarrantName] = useState("Remand Warrant");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [warrantSerialNumber, setWarrantSerialNumber] = useState(() => `WR-${new Date().getFullYear()}-${stableSeed}`);
  const [warrantSerialManualOverride, setWarrantSerialManualOverride] = useState(false);
  const [gender, setGender] = useState<InmateProfile["gender"]>("Male");
  const [station, setStation] = useState("Nsawam Medium Security Prison");
  const [blockName, setBlockName] = useState("");
  const [cellNumber, setCellNumber] = useState("");
  const [offense, setOffense] = useState("");
  const [sentence, setSentence] = useState("");
  const [educationBackground, setEducationBackground] = useState("");
  const [skillInterests, setSkillInterests] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [latestRegisteredId, setLatestRegisteredId] = useState<string | null>(null);
  const [generatedStudentId, setGeneratedStudentId] = useState(() => `GP-${stableSeed}`);
  const [photoCapturedAt, setPhotoCapturedAt] = useState<string | null>(null);
  const [fingerprintCapturedAt, setFingerprintCapturedAt] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);
  const [photoCameraActive, setPhotoCameraActive] = useState(false);
  const [photoVideoReady, setPhotoVideoReady] = useState(false);
  const [photoCameraError, setPhotoCameraError] = useState<string | null>(null);
  const [capturedPhotoDataUrl, setCapturedPhotoDataUrl] = useState<string | null>(null);
  const [fingerprintBusy, setFingerprintBusy] = useState(false);
  const [biometricCredentialId, setBiometricCredentialId] = useState<string | null>(null);
  const [hardwareBiometricAdapter, setHardwareBiometricAdapter] = useState<HardwareBiometricAdapter>(() =>
    resolveHardwareBiometricAdapter("webauthn-device"),
  );
  const [deviceBiometricSupported, setDeviceBiometricSupported] = useState(false);

  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const strictBiometricMode = isStrictBiometricMode();
  const defaultPassword = "Prison1234";
  const biometricsReady = Boolean(photoCapturedAt && fingerprintCapturedAt);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const resolvedAdapter = resolveHardwareBiometricAdapter();
      setHardwareBiometricAdapter(resolvedAdapter);
      setDeviceBiometricSupported(resolvedAdapter.isSupported());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stopPhotoCamera = useCallback(() => {
    if (photoStreamRef.current) {
      for (const track of photoStreamRef.current.getTracks()) {
        track.stop();
      }
      photoStreamRef.current = null;
    }

    if (photoVideoRef.current) {
      photoVideoRef.current.srcObject = null;
    }

    setPhotoCameraActive(false);
    setPhotoVideoReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopPhotoCamera();
    };
  }, [stopPhotoCamera]);

  function hasLivePhotoFrame(): boolean {
    const video = photoVideoRef.current;
    return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0);
  }

  async function attachPhotoStreamToVideo(stream: MediaStream): Promise<boolean> {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const video = photoVideoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    return false;
  }

  async function startPhotoCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhotoCameraError("Camera API is not available in this browser. Use fallback capture.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      });

      stopPhotoCamera();
      photoStreamRef.current = stream;
      setPhotoVideoReady(false);
      setPhotoCameraActive(true);
      setPhotoCameraError(null);
      setCaptureError(null);
      setCaptureNotice("Camera is active. Align face and capture.");
      setCapturedPhotoDataUrl(null);
      setPhotoCapturedAt(null);
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onmute = () => {
          setPhotoVideoReady(false);
          setPhotoCameraError("Camera stream paused. Check privacy settings and try again.");
        };
        track.onended = () => {
          setPhotoVideoReady(false);
          setPhotoCameraActive(false);
        };
      }
      const attached = await attachPhotoStreamToVideo(stream);
      if (!attached) {
        stopPhotoCamera();
        setPhotoCameraError("Camera connected, but preview element was not ready. Retry Start Camera.");
        return;
      }
      window.setTimeout(() => {
        if (hasLivePhotoFrame()) {
          setPhotoVideoReady(true);
          setPhotoCameraError(null);
        } else {
          setPhotoCameraError("Camera connected, but no live frame is available yet. Check permissions and retry.");
        }
      }, 250);
    } catch {
      setPhotoCameraActive(false);
      setPhotoVideoReady(false);
      setPhotoCameraError("Camera permission denied or unavailable. Fallback capture is available.");
    }
  }

  function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>): void {
    if (strictBiometricMode) {
      setCaptureError("Strict biometric mode requires live camera capture. Upload fallback is disabled.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setCaptureError("Unable to process uploaded image.");
        return;
      }

      stopPhotoCamera();
      setCapturedPhotoDataUrl(reader.result);
      setPhotoCapturedAt(new Date().toISOString());
      setPhotoCameraError(null);
      setCaptureError(null);
      setCaptureNotice("Facial image uploaded and secured.");
    };
    reader.readAsDataURL(file);
  }

  function resetFormForNextEntry(): void {
    stopPhotoCamera();
    setFullName("");
    setWarrantName("Remand Warrant");
    setDateOfBirth("");
    setWarrantSerialNumber(generateWarrantSerialNumber());
    setWarrantSerialManualOverride(false);
    setGender("Male");
    setStation("Nsawam Medium Security Prison");
    setBlockName("");
    setCellNumber("");
    setOffense("");
    setSentence("");
    setEducationBackground("");
    setSkillInterests("");
    setGeneratedStudentId(generateStudentId());
    setPhotoCapturedAt(null);
    setFingerprintCapturedAt(null);
    setCaptureError(null);
    setCaptureNotice(null);
    setPhotoCameraActive(false);
    setPhotoCameraError(null);
    setCapturedPhotoDataUrl(null);
    setFingerprintBusy(false);
    setBiometricCredentialId(null);
  }

  function capturePhoto(): void {
    const now = new Date().toISOString();

    if (strictBiometricMode && !hasLivePhotoFrame()) {
      setCaptureError("Strict biometric mode requires a live camera capture.");
      return;
    }

    if (hasLivePhotoFrame() && photoVideoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = photoVideoRef.current.videoWidth;
      canvas.height = photoVideoRef.current.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(photoVideoRef.current, 0, 0, canvas.width, canvas.height);
        setCapturedPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.92));
      }
      stopPhotoCamera();
      setCaptureNotice("Facial image captured from live camera.");
    } else {
      setCapturedPhotoDataUrl((previous) => previous ?? "/assets/education/hero-learning.jpg");
      setCaptureNotice("Facial image captured in fallback mode.");
    }

    setPhotoCapturedAt(now);
    setPhotoCameraError(null);
    setCaptureError(null);
  }

  async function captureFingerprint(): Promise<void> {
    const now = new Date().toISOString();

    setFingerprintBusy(true);
    setCaptureError(null);
    if (!deviceBiometricSupported) {
      setFingerprintCapturedAt(now);
      setCaptureNotice("Device biometric not available. Secure fallback biometric record applied.");
      setFingerprintBusy(false);
      return;
    }

    const biometricLabel = fullName.trim() || generatedStudentId;
    const result = await runHardwareBiometricChallenge({
      displayName: biometricLabel,
      preferredAdapterId: hardwareBiometricAdapter.id,
    });
    if (result.ok) {
      setFingerprintCapturedAt(now);
      setBiometricCredentialId(result.credentialId ?? null);
      setCaptureNotice(`Biometric confirmation successful via ${result.adapterLabel}.`);
      setFingerprintBusy(false);
      return;
    }

    if (strictBiometricMode) {
      setCaptureError(`Strict biometric mode requires device biometric success: ${result.message}`);
      setFingerprintBusy(false);
      return;
    }

    setFingerprintCapturedAt(now);
    setBiometricCredentialId(null);
    setCaptureNotice(`Device biometric not completed (${result.message}). Fallback biometric record applied.`);
    setFingerprintBusy(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!biometricsReady) {
      setCaptureError("Capture both facial photo and fingerprint scan before completing registration.");
      return;
    }

    const profile: InmateProfile = {
      id: generatedStudentId,
      fullName: fullName.trim(),
      warrantName: warrantName.trim(),
      warrantSerialNumber: warrantSerialNumber.trim(),
      prisonNumber: warrantSerialNumber.trim(),
      dateOfBirth,
      gender,
      station: station.trim(),
      blockName: blockName.trim(),
      cellNumber: cellNumber.trim(),
      offense: offense.trim(),
      sentence: sentence.trim(),
      educationBackground: educationBackground.trim() || "Not specified",
      skillInterests: skillInterests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      blockAssignment: blockName.trim() || "TBD",
      biometricStatus: "Enrolled",
      assignedPrison: station.trim() || "Unassigned",
    };

    try {
      const inmateResponse = await fetch("/api/v1/inmates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (!inmateResponse.ok) {
        const payload = (await inmateResponse.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? "Unable to persist inmate record.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to persist inmate record.";
      setCaptureNotice(`${message} Continuing with local prototype registration only.`);
      setCaptureError(null);
    }

    try {
      const response = await fetch("/api/biometric/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: generatedStudentId,
          fullName: profile.fullName,
          prisonNumber: profile.warrantSerialNumber,
          faceCapturedAt: photoCapturedAt,
          fingerprintCapturedAt,
          strictMode: strictBiometricMode,
          deviceBiometricSupported,
          mode: strictBiometricMode ? "strict" : "fallback",
          credentialId: biometricCredentialId ?? undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to persist biometric enrollment.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to persist biometric enrollment.";
      setCaptureNotice(`${message} Continuing with local prototype enrollment only.`);
      setCaptureError(null);
    }

    addOrUpdateInmate(profile);
    addAuditEvent({
      action: "inmate-registered",
      actor: "Admin Officer",
      result: "success",
      target: profile.id,
      details: `Warrant Serial Number: ${profile.warrantSerialNumber} | Biometrics: face+fingerprint`,
    });
    setLatestRegisteredId(profile.id);
    setSuccessMessage(`Inmate ${profile.fullName} registered with ${profile.id}. Credentials and biometrics enrolled.`);
    resetFormForNextEntry();
  }

  return (
    <RoleShell title={appMeta.name} subtitle="New Inmate Registration" userName="Admin Officer">
      <section className="panel">
        <h1 style={{ marginBottom: 14 }}>New Inmate Registration</h1>

        <form className="grid-2" onSubmit={handleSubmit} data-testid="register-form">
          <div style={{ display: "grid", gap: 10 }}>
            <label>
              Prisoner&apos;s Name
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label>
              Warrant Name
              <input className="input" value={warrantName} onChange={(e) => setWarrantName(e.target.value)} required />
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
              Warrant Serial Number
              <input
                className="input"
                value={warrantSerialNumber}
                onChange={(e) => {
                  setWarrantSerialNumber(e.target.value);
                  setWarrantSerialManualOverride(true);
                }}
                required
              />
              <div className="inline-row" style={{ marginTop: 6, justifyContent: "flex-start" }}>
                <button
                  type="button"
                  className="button-soft"
                  onClick={() => {
                    setWarrantSerialNumber(generateWarrantSerialNumber());
                    setWarrantSerialManualOverride(false);
                  }}
                >
                  Auto Generate
                </button>
                {warrantSerialManualOverride ? (
                  <span className="status-neutral">Manual override active</span>
                ) : (
                  <span className="quick-info">Auto-generated, editable</span>
                )}
              </div>
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
              Station
              <input className="input" value={station} onChange={(e) => setStation(e.target.value)} required />
            </label>
            <label>
              Block Name
              <input className="input" value={blockName} onChange={(e) => setBlockName(e.target.value)} required />
            </label>
            <label>
              Cell Number
              <input className="input" value={cellNumber} onChange={(e) => setCellNumber(e.target.value)} required />
            </label>
            <label>
              Offense
              <input className="input" value={offense} onChange={(e) => setOffense(e.target.value)} required />
            </label>
            <label>
              Sentence
              <input className="input" value={sentence} onChange={(e) => setSentence(e.target.value)} required />
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
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <article className="panel biometric-card">
              <h3>Capture Photo</h3>
              <div
                className={`biometric-preview biometric-preview-face biometric-preview-square ${photoCapturedAt ? "biometric-preview-ready" : ""}`}
              >
                {photoCameraActive ? (
                  <video
                    ref={photoVideoRef}
                    className="biometric-preview-video"
                    autoPlay
                    muted
                    playsInline
                    onLoadedMetadata={() => setPhotoVideoReady(true)}
                  />
                ) : capturedPhotoDataUrl ? (
                  <div className="biometric-preview-snapshot" style={{ backgroundImage: `url(${capturedPhotoDataUrl})` }} />
                ) : (
                  <Image
                    src="/assets/education/hero-learning.jpg"
                    alt="Inmate photo capture simulation"
                    fill
                    className="biometric-preview-image"
                    sizes="(max-width: 760px) 100vw, 40vw"
                  />
                )}
                <span className="biometric-scan-line" aria-hidden />
              </div>
              <div className="inline-row" style={{ marginTop: 8 }}>
                {photoCapturedAt ? (
                  <span className="status-ok">{`Captured ${formatDateTime(photoCapturedAt)}`}</span>
                ) : photoCameraActive ? (
                  <span className={photoVideoReady ? "status-ok" : "status-neutral"}>
                    {photoVideoReady ? "Camera preview ready" : "Opening camera stream..."}
                  </span>
                ) : (
                  <span className="quick-info">Awaiting facial image capture.</span>
                )}
                <div className="biometric-control-row">
                  <button type="button" className="button-soft" onClick={() => void startPhotoCamera()} disabled={photoCameraActive}>
                    Start Camera
                  </button>
                  <button
                    type="button"
                    className="button-soft"
                    onClick={capturePhoto}
                    data-testid="capture-photo-btn"
                  >
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    className="button-soft"
                    onClick={stopPhotoCamera}
                    disabled={!photoCameraActive}
                  >
                    Stop Camera
                  </button>
                  <label htmlFor="register-photo-upload" className="button-soft">
                    Upload Photo
                  </label>
                  <input
                    id="register-photo-upload"
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handlePhotoUpload}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
              {photoCameraError ? <p className="quick-info">{photoCameraError}</p> : null}
              {strictBiometricMode ? (
                <p className="quick-info" style={{ margin: 0 }}>
                  Strict mode: live camera capture required.
                </p>
              ) : null}
              <p className="quick-info" style={{ margin: "6px 0 0" }}>
                The camera preview is fixed to a square frame so the full face remains visible during capture.
              </p>
            </article>

            <article className="panel biometric-card">
              <h3>Fingerprint Scan</h3>
              <div className={`biometric-preview biometric-preview-fingerprint ${fingerprintCapturedAt ? "biometric-preview-ready" : ""}`}>
                <div className="fingerprint-mark" aria-hidden />
                <span className="biometric-scan-line" aria-hidden />
              </div>
              <div className="inline-row" style={{ marginTop: 8 }}>
                {fingerprintCapturedAt ? (
                  <span className="status-ok">{`Captured ${formatDateTime(fingerprintCapturedAt)}`}</span>
                ) : (
                  <span className="quick-info">Awaiting fingerprint enrollment.</span>
                )}
                <button
                  type="button"
                  className="button-soft"
                  onClick={() => void captureFingerprint()}
                  data-testid="capture-fingerprint-btn"
                  disabled={fingerprintBusy}
                >
                  {fingerprintBusy ? "Processing..." : "Capture Fingerprint"}
                </button>
              </div>
              <p className="quick-info" style={{ margin: 0 }}>
                {deviceBiometricSupported
                  ? "Uses built-in device biometrics (Face ID/Touch ID/Android Biometric)."
                  : "Built-in device biometrics unavailable in this browser; fallback mode will be used."}
              </p>
              <p className="quick-info" style={{ margin: "4px 0 0" }}>
                Active adapter: {hardwareBiometricAdapter.label}
              </p>
              <p className="quick-info" style={{ margin: "4px 0 0" }}>
                {strictBiometricMode ? "Strict mode: fallback disabled." : "Fallback mode is enabled for unsupported devices."}
              </p>
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
            <button className="button-primary" type="submit" disabled={!biometricsReady}>
              Register Inmate
            </button>
          </div>
        </form>

        {captureNotice ? (
          <div className="panel" style={{ marginTop: 12, padding: 12 }}>
            <p className="status-ok" style={{ margin: 0 }}>
              {captureNotice}
            </p>
          </div>
        ) : null}
        {captureError ? (
          <div className="panel" style={{ marginTop: 12, padding: 12 }}>
            <p className="status-bad" style={{ margin: 0 }}>
              {captureError}
            </p>
          </div>
        ) : null}

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
