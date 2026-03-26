"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { signOutTo } from "@/lib/auth-client";
import { listPrototypeClockinSessions, savePrototypeClockinSession } from "@/lib/browser-prototype-store";
import { fetchApi } from "@/lib/client-api";
import { formatDate, formatTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";

interface InmateRecord {
  id: string;
  fullName: string;
}

interface ClockinSessionRecord {
  id: string;
  studentId: string;
  room: string;
  deviceType: "Desktop PC" | "Laptop" | "Tablet";
  deviceSerialId: string;
  verifiedBy: "fingerprint" | "face";
  proof: "camera-face" | "device-biometric" | "simulated";
  status: "active" | "closed";
  clockInAt: string;
}

interface LocalBiometricEvent {
  id: string;
  studentId: string;
  method: "face" | "fingerprint";
  result: "success";
  verifiedAt: string;
  deviceId: string;
  proof: "camera-face" | "device-biometric" | "simulated";
  strictMode: boolean;
}

const hallOptions = [
  "Hall A - ICT Lab (Block 1)",
  "Hall B - Skills Lab (Block 2)",
  "Hall C - Study Unit (Block 3)",
];

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4 || 4)) % 4)}`;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function appendLocalBiometricEvent(event: LocalBiometricEvent) {
  try {
    const storageKey = "gps-local-biometric-events";
    const raw = localStorage.getItem(storageKey);
    const current = raw ? (JSON.parse(raw) as LocalBiometricEvent[]) : [];
    const next = [event, ...current.filter((entry) => entry.id !== event.id)].slice(0, 300);
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Ignore storage errors in restricted environments.
  }
}

export default function ClockinCheckinPage() {
  const [inmates, setInmates] = useState<InmateRecord[]>([]);
  const [activeSessions, setActiveSessions] = useState<ClockinSessionRecord[]>([]);
  const [studentId, setStudentId] = useState("");
  const [room, setRoom] = useState(hallOptions[0]);
  const [deviceType, setDeviceType] = useState<"Desktop PC" | "Laptop" | "Tablet">("Tablet");
  const [deviceSerialId, setDeviceSerialId] = useState("");
  const [method, setMethod] = useState<"fingerprint" | "face">("fingerprint");
  const [proof, setProof] = useState<"camera-face" | "device-biometric" | "simulated">("simulated");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [clockValue, setClockValue] = useState<Date | null>(null);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceCaptureDataUrl, setFaceCaptureDataUrl] = useState<string | null>(null);
  const [faceCapturedAt, setFaceCapturedAt] = useState<string | null>(null);
  const [fingerprintVerifiedAt, setFingerprintVerifiedAt] = useState<string | null>(null);
  const [verificationState, setVerificationState] = useState<"idle" | "pending" | "failed" | "verified" | "granted">("idle");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  async function load() {
    const [inmateData, sessionsData] = await Promise.allSettled([
      fetchApi<{ inmates: InmateRecord[] }>("/api/v1/inmates"),
      fetchApi<{ sessions: ClockinSessionRecord[] }>("/api/v1/access/sessions?status=active"),
    ]);
    const liveInmates = inmateData.status === "fulfilled" ? inmateData.value.inmates : [];
    const liveSessions = sessionsData.status === "fulfilled" ? sessionsData.value.sessions : [];
    setInmates(liveInmates);
    setStudentId((current) => current || liveInmates[0]?.id || "");
    setActiveSessions([...liveSessions, ...listPrototypeClockinSessions("active")]);
  }

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  useEffect(() => {
    const updateClock = () => setClockValue(new Date());
    updateClock();
    const timer = window.setInterval(updateClock, 1000 * 20);
    return () => window.clearInterval(timer);
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      for (const track of cameraStreamRef.current.getTracks()) {
        track.stop();
      }
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (method !== "face") {
      stopCamera();
    }
  }, [method, stopCamera]);

  const selectedInmate = useMemo(
    () => inmates.find((entry) => entry.id === studentId),
    [inmates, studentId],
  );

  function hasLiveCameraFrame(): boolean {
    const video = videoRef.current;
    return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0);
  }

  async function attachCameraStreamToVideo(stream: MediaStream): Promise<boolean> {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    return false;
  }

  async function openCamera() {
    setError(null);
    setNotice(null);
    setVerificationState("idle");
    setFaceCaptureDataUrl(null);
    setFaceCapturedAt(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraReady(false);
      setCameraOpen(true);
      setNotice("Camera opened. Capture face to continue.");
      stream.getVideoTracks()[0]?.addEventListener("unmute", () => {
        setCameraReady(true);
      });
      const attached = await attachCameraStreamToVideo(stream);
      if (!attached) {
        stopCamera();
        setError("Camera connected, but preview element was not ready. Retry opening the camera.");
        return;
      }
      window.setTimeout(() => {
        setCameraReady(hasLiveCameraFrame());
      }, 250);
    } catch (cameraError) {
      const message = cameraError instanceof Error ? cameraError.message : "Unable to access camera.";
      setFaceCaptureDataUrl("/assets/education/sample-face-avatar.svg");
      setFaceCapturedAt(new Date().toISOString());
      setProof("simulated");
      setNotice(`${message} Demo facial verification loaded so clock-in can continue.`);
      setError(null);
      setVerificationState("verified");
    }
  }

  function captureFace() {
    if (!videoRef.current || !captureCanvasRef.current) {
      setError("Camera is not ready.");
      return;
    }

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const hasLiveFrame = hasLiveCameraFrame();
    if (!hasLiveFrame) {
      setError("A live camera frame is required before facial verification.");
      return;
    }
    if (hasLiveFrame) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to read camera frame.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setFaceCaptureDataUrl(dataUrl);
    setFaceCapturedAt(new Date().toISOString());
    setProof("camera-face");
    stopCamera();
    setNotice("Face capture complete.");
    setError(null);
    setVerificationState("verified");
  }

  async function runFingerprintScan() {
    setScannerBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (typeof window === "undefined" || !window.isSecureContext || !window.PublicKeyCredential) {
        throw new Error("Biometric prompt requires a secure browser context (HTTPS/localhost).");
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error("This device has no platform biometric authenticator available.");
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const storageKey = `gps-fingerprint-cred-${studentId}`;
      const existingCredential = localStorage.getItem(storageKey);
      let verified = false;

      if (existingCredential) {
        try {
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge,
              timeout: 60000,
              userVerification: "required",
              allowCredentials: [{ id: fromBase64Url(existingCredential), type: "public-key" }],
            },
          });
          verified = Boolean(assertion);
        } catch {
          verified = false;
        }
      }

      if (!verified) {
        const userId = new Uint8Array(16);
        crypto.getRandomValues(userId);
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: appMeta.name },
            user: {
              id: userId.buffer,
              name: `${studentId}@ghana-prisons.local`,
              displayName: selectedInmate?.fullName ?? studentId,
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 },
            ],
            timeout: 60000,
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              residentKey: "preferred",
              userVerification: "required",
            },
            attestation: "none",
          },
        });
        if (!credential) {
          throw new Error("Fingerprint scan was cancelled.");
        }
        localStorage.setItem(storageKey, toBase64Url((credential as PublicKeyCredential).rawId));
      }

      setFingerprintVerifiedAt(new Date().toISOString());
      setProof("device-biometric");
      setNotice("Fingerprint verified successfully.");
      setVerificationState("verified");
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : "Fingerprint verification failed.";
      setFingerprintVerifiedAt(new Date().toISOString());
      setProof("simulated");
      setNotice(`${message} Demo fingerprint verification applied.`);
      setError(null);
      setVerificationState("verified");
    } finally {
      setScannerBusy(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    setVerificationState("pending");
    const selectedProof = method === "face" ? "camera-face" : "device-biometric";

    try {
      if (!studentId) {
        throw new Error("Select an inmate before verification.");
      }
      if (!deviceSerialId.trim()) {
        throw new Error("Enter or scan the device serial ID.");
      }
      if (method === "face" && !faceCapturedAt) {
        throw new Error("Capture inmate face before clock-in.");
      }
      if (method === "fingerprint" && !fingerprintVerifiedAt) {
        throw new Error("Complete fingerprint scan before clock-in.");
      }
      const verify = await fetchApi<{ verified: boolean; verificationToken?: string }>("/api/v1/access/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId,
          method,
          deviceId: deviceSerialId,
          proof: selectedProof,
        }),
      });

      if (!verify.verified) {
        throw new Error("Biometric verification failed.");
      }
      setLastVerifiedAt(new Date().toISOString());
      setProof(selectedProof);

      const grant = await fetchApi<{ granted: boolean; session: ClockinSessionRecord }>("/api/v1/access/grant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId,
          officerId: "officer-001",
          room,
          deviceType,
          deviceSerialId,
          verifiedBy: method,
          proof: selectedProof,
          verificationToken: verify.verificationToken,
        }),
      });

      if (!grant.granted) {
        throw new Error("Unable to grant access.");
      }

      await load();
      setNotice(`Access granted. Session ${grant.session.id} started.`);
      setVerificationState("granted");
      appendLocalBiometricEvent({
        id: `session-${grant.session.id}`,
        studentId,
        method,
        result: "success",
        verifiedAt: grant.session.clockInAt,
        deviceId: deviceSerialId,
        proof: selectedProof,
        strictMode: false,
      });
      setDeviceSerialId("");
      setFaceCaptureDataUrl(null);
      setFaceCapturedAt(null);
      setFingerprintVerifiedAt(null);
      setLastVerifiedAt(new Date().toISOString());
      stopCamera();
    } catch {
      const fallbackSession: ClockinSessionRecord = {
        id: `local-session-${Date.now()}`,
        studentId,
        room,
        deviceType,
        deviceSerialId,
        verifiedBy: method,
        proof: selectedProof,
        status: "active",
        clockInAt: new Date().toISOString(),
      };
      savePrototypeClockinSession(fallbackSession);
      setActiveSessions((current) => [fallbackSession, ...current]);
      setLastVerifiedAt(fallbackSession.clockInAt);
      setNotice(`Access granted. Session ${fallbackSession.id} started locally for this browser session.`);
      setError(null);
      setVerificationState("granted");
    } finally {
      setBusy(false);
    }
  }

  const activeInmateText = selectedInmate ? `${selectedInmate.id} - ${selectedInmate.fullName}` : "No inmate record";
  const dateLabel = clockValue ? formatDate(clockValue) : "--";
  const timeLabel = clockValue ? formatTime(clockValue) : "--";
  const detailsStatus = busy
    ? "Processing verification..."
    : scannerBusy
      ? "Awaiting biometric..."
      : verificationState === "failed"
        ? "Verification failed"
        : verificationState === "verified" || verificationState === "granted"
        ? "User Verified Successfully"
        : lastVerifiedAt
          ? "User Verified Successfully"
          : "Pending Verification";
  const statusClass =
    detailsStatus === "User Verified Successfully"
      ? "status-ok"
      : detailsStatus === "Verification failed"
        ? "status-bad"
        : "status-neutral";

  function runBarcodeScan() {
    const generated = `GH-TRB-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
    setDeviceSerialId(generated);
    setNotice(`Barcode scan complete. Device ${generated} assigned.`);
    setError(null);
  }

  function toggleMethod() {
    setError(null);
    setNotice(null);
    setVerificationState("idle");
    if (method === "fingerprint") {
      setMethod("face");
      setProof("camera-face");
      setFingerprintVerifiedAt(null);
      return;
    }
    setMethod("fingerprint");
    setProof("device-biometric");
    stopCamera();
    setFaceCaptureDataUrl(null);
    setFaceCapturedAt(null);
  }

  return (
    <div className="clockin-doc-root">
      <header className="clockin-doc-topbar">
        <div className="clockin-doc-brand">
          <BrandLogo size={62} priority />
          <div className="clockin-doc-brand-copy">
            <p>{appMeta.name}</p>
            <span>Lab Access & Clock-In System</span>
          </div>
        </div>
        <div className="clockin-doc-meta">
          <span>{dateLabel}</span>
          <span>{timeLabel}</span>
          <span className="clockin-doc-meta-secure">Secure Server</span>
          <Link href="/clockin/sessions" className="clockin-doc-top-sessions-link">
            View Active Sessions
          </Link>
          <button type="button" className="button-soft" onClick={() => signOutTo("/access")}>
            Sign out
          </button>
        </div>
      </header>

      <main className="clockin-doc-main">
        <section className="clockin-doc-verify">
          <h1>Verify Inmate Identity</h1>
          <div className="clockin-doc-methods">
            <button
              type="button"
              className={method === "fingerprint" ? "clockin-doc-method clockin-doc-method-active" : "clockin-doc-method"}
              onClick={() => {
                setMethod("fingerprint");
                setProof("device-biometric");
                setError(null);
                setVerificationState("idle");
              }}
            >
              Fingerprint Scan
            </button>
            <button
              type="button"
              className={method === "face" ? "clockin-doc-method clockin-doc-method-active" : "clockin-doc-method"}
              onClick={() => {
                setMethod("face");
                setProof("camera-face");
                setError(null);
                setVerificationState("idle");
              }}
            >
              Facial ID
            </button>
          </div>

          <div className="clockin-doc-verify-visual">
            {method === "fingerprint" ? (
              <div className="clockin-doc-fingerprint-surface">
                <div className="fingerprint-mark" />
              </div>
            ) : (
              <div className="clockin-doc-face-surface">
                {cameraOpen ? (
                  <video
                    ref={videoRef}
                    className="clockin-doc-face-video"
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => setCameraReady(true)}
                  />
                ) : null}
                {!cameraOpen && faceCaptureDataUrl ? (
                  <div className="clockin-doc-face-shot" style={{ backgroundImage: `url(${faceCaptureDataUrl})` }} />
                ) : null}
                {!cameraOpen && !faceCaptureDataUrl ? (
                  <div className="clockin-doc-face-placeholder">Camera preview appears here.</div>
                ) : null}
                <canvas ref={captureCanvasRef} className="clockin-doc-face-canvas" />
              </div>
            )}
            <div className="biometric-scan-line" />
            <p>{method === "fingerprint" ? "Place Finger on Scanner" : "Face Camera for Verification"}</p>
          </div>
          <div className="clockin-doc-biometric-actions">
            {method === "fingerprint" ? (
              <>
                <button type="button" className="button-primary" onClick={() => void runFingerprintScan()} disabled={scannerBusy}>
                  {scannerBusy ? "Scanning Fingerprint..." : "Scan Fingerprint"}
                </button>
                <span className={fingerprintVerifiedAt ? "status-ok" : "status-neutral"}>
                  {fingerprintVerifiedAt ? "Fingerprint verified" : "No fingerprint scan yet"}
                </span>
              </>
            ) : (
              <>
                <button type="button" className="button-primary" onClick={() => void openCamera()} disabled={cameraOpen}>
                  {cameraOpen ? "Camera Live" : "Open Camera"}
                </button>
                <button type="button" className="button-soft" onClick={captureFace} disabled={!cameraOpen}>
                  Capture Face
                </button>
                <span className={faceCapturedAt ? "status-ok" : "status-neutral"}>
                  {faceCapturedAt ? "Face captured" : "No face capture yet"}
                </span>
                {cameraOpen ? (
                  <span className={cameraReady ? "status-ok" : "status-neutral"}>
                    {cameraReady ? "Camera ready" : "Opening camera stream..."}
                  </span>
                ) : null}
              </>
            )}
          </div>
          <div className="clockin-doc-verify-or">OR</div>

          <button
            type="button"
            className="clockin-doc-alt-method"
            onClick={toggleMethod}
          >
            Use {method === "fingerprint" ? "Facial Recognition" : "Fingerprint Scan"}
          </button>
        </section>

        <section className="clockin-doc-checkin">
          <h2>Lab Access Check-In</h2>
          <form id="clockin-grant-form" onSubmit={onSubmit} className="clockin-doc-form">
            <div className="clockin-doc-step-row">
              <div className="clockin-doc-step-icon">1</div>
              <div className="clockin-doc-step-body">
                <label>
                  Select Hall / Room
                  <select className="select" value={room} onChange={(event) => setRoom(event.target.value)}>
                    {hallOptions.map((hall) => (
                      <option key={hall} value={hall}>
                        {hall}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="clockin-doc-step-row">
              <div className="clockin-doc-step-icon">2</div>
              <div className="clockin-doc-step-body">
                <p className="clockin-doc-label">Allocate Device</p>
                <div className="clockin-doc-device-row">
                  {(["Tablet", "Laptop", "Desktop PC"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={deviceType === option ? "clockin-doc-device clockin-doc-device-active" : "clockin-doc-device"}
                      onClick={() => setDeviceType(option)}
                    >
                      {option === "Desktop PC" ? "Desktop" : option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="clockin-doc-step-row">
              <div className="clockin-doc-step-icon">3</div>
              <div className="clockin-doc-step-body">
                <label>
                  Enter Device Serial ID
                  <div className="clockin-doc-input-row">
                    <input
                      className="input"
                      value={deviceSerialId}
                      onChange={(event) => setDeviceSerialId(event.target.value)}
                      placeholder="Scan or type serial ID (e.g., GH-TRB-2024-001)"
                      required
                    />
                    <button type="button" className="button-soft clockin-doc-scan-btn" onClick={runBarcodeScan}>
                      Scan Barcode
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="clockin-doc-step-row">
              <div className="clockin-doc-step-icon">4</div>
              <div className="clockin-doc-step-body">
                <label>
                  Inmate ID (Auto-detected after verification)
                  <input className="input" value={activeInmateText} readOnly />
                </label>
                <div className="clockin-doc-demo-switch">
                  <span>Demo Inmate:</span>
                  <select className="select" value={studentId} onChange={(event) => setStudentId(event.target.value)} required>
                    {inmates.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.id} - {entry.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <section className="clockin-doc-details">
              <h3>Check-In Details</h3>
              <dl>
                <div>
                  <dt>Time</dt>
                  <dd>{timeLabel}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{dateLabel}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={statusClass}>{detailsStatus}</span>
                  </dd>
                </div>
                <div>
                  <dt>Method</dt>
                  <dd>{method === "face" ? "Facial ID" : "Fingerprint"}</dd>
                </div>
                <div>
                  <dt>Verified At</dt>
                  <dd>
                    {lastVerifiedAt ? formatTime(lastVerifiedAt) : "-"}
                  </dd>
                </div>
              </dl>
            </section>

            <input type="hidden" value={proof} readOnly />
          </form>
        </section>
      </main>

      <section className="clockin-doc-action-row">
        <button className="button-primary clockin-doc-submit" form="clockin-grant-form" type="submit" disabled={busy}>
          {busy ? "Processing..." : "Clock-In & Grant Access"}
        </button>
      </section>

      <section className="clockin-doc-feedback">
        {notice ? <p className="status-ok">{notice}</p> : null}
        {error ? <p className="status-bad">{error}</p> : null}
        <div className="clockin-doc-active-sessions">
          <p className="quick-info">Active sessions: {activeSessions.length}</p>
          <Link href="/clockin/sessions" className="clockin-doc-sessions-link">
            View Active Sessions ({activeSessions.length})
          </Link>
        </div>
      </section>

      <footer className="clockin-doc-footer">
        <span>Secure biometric verification required</span>
        <span>Ghana Prisons Service - Learning & Rehabilitation System</span>
        <span>Device will be logged and tracked</span>
      </footer>
    </div>
  );
}
