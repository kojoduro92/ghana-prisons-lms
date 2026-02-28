"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { roleHomePath } from "@/lib/auth";
import { useAppShell } from "@/lib/app-shell";
import { formatDateTime } from "@/lib/format";
import { isStrictBiometricMode } from "@/lib/biometric-policy";
import { resolveHardwareBiometricAdapter, runHardwareBiometricChallenge } from "@/lib/hardware-biometric-adapter";
import {
  addAttendanceEvent,
  addAuditEvent,
  createEntryEvent,
  getAttendanceEventsForStudent,
  getLatestOpenEntry,
} from "@/lib/portal-state";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";
import { appendVerificationLog, simulateVerificationAttempt } from "@/lib/verification";
import { BrandLogo } from "@/components/brand-logo";
import type { VerificationAttempt } from "@/types/domain";

const facilityOptions = ["Digital Learning Lab", "Library Study Hall", "Vocational Workshop", "Language Lab"] as const;
const deviceOptions = ["Desktop PC", "Laptop", "Tablet"] as const;

export default function VerificationPage() {
  const router = useRouter();
  const { session, setActiveSession } = useAppShell();
  const [method, setMethod] = useState<VerificationAttempt["method"]>("fingerprint");
  const [result, setResult] = useState<VerificationAttempt["result"] | null>(null);
  const [lastAttempt, setLastAttempt] = useState<VerificationAttempt | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceCameraError, setFaceCameraError] = useState<string | null>(null);
  const [faceCapturedAt, setFaceCapturedAt] = useState<string | null>(null);
  const [faceSnapshotDataUrl, setFaceSnapshotDataUrl] = useState<string | null>(null);
  const [deviceBiometricAt, setDeviceBiometricAt] = useState<string | null>(null);
  const [deviceBiometricMessage, setDeviceBiometricMessage] = useState<string | null>(null);
  const [deviceBiometricBusy, setDeviceBiometricBusy] = useState(false);
  const [facility, setFacility] = useState<(typeof facilityOptions)[number]>("Digital Learning Lab");
  const [allocatedDeviceType, setAllocatedDeviceType] = useState<(typeof deviceOptions)[number]>("Tablet");
  const [logs, setLogs] = useState<VerificationAttempt[]>(
    () => browserStorage.loadState<VerificationAttempt[]>(STORAGE_KEYS.verificationLogs) ?? [],
  );
  const faceVideoRef = useRef<HTMLVideoElement | null>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);
  const strictBiometricMode = isStrictBiometricMode();
  const hardwareBiometricAdapter = resolveHardwareBiometricAdapter();
  const deviceBiometricSupported = hardwareBiometricAdapter.isSupported();

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("next");
  }, []);
  const reason = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("reason");
  }, []);

  const stopFaceCamera = useCallback(() => {
    if (faceStreamRef.current) {
      for (const track of faceStreamRef.current.getTracks()) {
        track.stop();
      }
      faceStreamRef.current = null;
    }

    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = null;
    }

    setFaceCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopFaceCamera();
    };
  }, [stopFaceCamera]);

  async function startFaceCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      setFaceCameraError("Camera API is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      });

      stopFaceCamera();
      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        await faceVideoRef.current.play().catch(() => undefined);
      }

      setFaceCameraActive(true);
      setFaceCameraError(null);
    } catch {
      setFaceCameraActive(false);
      setFaceCameraError("Camera permission denied or unavailable. Fallback face capture can still be used.");
    }
  }

  function captureFace(): void {
    const now = new Date().toISOString();

    if (strictBiometricMode && (!faceCameraActive || !faceVideoRef.current || faceVideoRef.current.videoWidth <= 0)) {
      setFaceCameraError("Strict biometric mode requires live camera capture before verification.");
      return;
    }

    if (faceCameraActive && faceVideoRef.current && faceVideoRef.current.videoWidth > 0) {
      const canvas = document.createElement("canvas");
      canvas.width = faceVideoRef.current.videoWidth;
      canvas.height = faceVideoRef.current.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(faceVideoRef.current, 0, 0, canvas.width, canvas.height);
        setFaceSnapshotDataUrl(canvas.toDataURL("image/jpeg", 0.92));
      }
      stopFaceCamera();
    } else {
      setFaceSnapshotDataUrl((previous) => previous ?? "/assets/education/hero-library.jpg");
    }

    setFaceCapturedAt(now);
    setFaceCameraError(null);
    setScanCount((previous) => previous + 1);
  }

  async function triggerDeviceBiometric(): Promise<void> {
    const now = new Date().toISOString();
    setDeviceBiometricBusy(true);

    if (!deviceBiometricSupported) {
      if (strictBiometricMode) {
        setDeviceBiometricMessage("Strict mode requires device biometric support on this device/browser.");
        setDeviceBiometricBusy(false);
        return;
      }

      setDeviceBiometricAt(now);
      setDeviceBiometricMessage("Device biometric unsupported in this browser. Fallback biometric proof applied.");
      setDeviceBiometricBusy(false);
      return;
    }

    const label = session?.displayName ?? session?.studentId ?? session?.userId ?? "inmate";
    const response = await runHardwareBiometricChallenge({
      displayName: label,
      preferredAdapterId: hardwareBiometricAdapter.id,
    });
    if (response.ok) {
      setDeviceBiometricAt(now);
      setDeviceBiometricMessage(`Device biometric confirmation successful via ${response.adapterLabel}.`);
      setDeviceBiometricBusy(false);
      setScanCount((previous) => previous + 1);
      return;
    }

    setDeviceBiometricAt(now);
    if (strictBiometricMode) {
      setDeviceBiometricMessage(`Strict mode requires successful biometric prompt (${response.message}).`);
      setDeviceBiometricBusy(false);
      return;
    }

    setDeviceBiometricMessage(`Device biometric not completed (${response.message}). Fallback proof applied.`);
    setDeviceBiometricBusy(false);
  }

  function runVerification() {
    const usingFaceProof = method === "face" && Boolean(faceCapturedAt);
    const usingDeviceProof = method === "fingerprint" && Boolean(deviceBiometricAt);
    const forcedResult = strictBiometricMode
      ? usingFaceProof || usingDeviceProof
        ? "success"
        : "failed"
      : usingFaceProof || usingDeviceProof
        ? "success"
        : undefined;
    const deviceLabel = allocatedDeviceType.toLowerCase().replaceAll(" ", "-");
    const deviceId = usingFaceProof
      ? `${deviceLabel}-camera-01`
      : usingDeviceProof
        ? `${deviceLabel}-biometric-01`
        : `${deviceLabel}-terminal-01`;
    const proof = usingFaceProof ? "camera-face" : usingDeviceProof ? "device-biometric" : "simulated";
    const attempt = simulateVerificationAttempt(method, Math.random(), {
      forceResult: forcedResult,
      deviceId,
    });
    const nextLogs = appendVerificationLog(logs, attempt);

    browserStorage.saveState(STORAGE_KEYS.verificationLogs, nextLogs);
    setLogs(nextLogs);
    setResult(attempt.result);
    setLastAttempt(attempt);
    setScanCount((previous) => previous + 1);
    addAuditEvent({
      action: "biometric-verification",
      actor: session?.displayName ?? session?.userId ?? "unknown",
      result: attempt.result,
      target: attempt.method,
      details: `Facility: ${facility} | Device: ${attempt.deviceId} | Type: ${allocatedDeviceType} | Proof: ${proof}${
        strictBiometricMode ? " | Policy: strict" : " | Policy: fallback"
      } | Adapter: ${hardwareBiometricAdapter.id}`,
    });

    const studentId = session?.studentId ?? session?.userId ?? "unknown";
    void fetch("/api/biometric/verifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId,
        method: attempt.method,
        result: attempt.result,
        deviceId: attempt.deviceId,
        proof,
        strictMode: strictBiometricMode,
        facility,
        allocatedDeviceType,
      }),
    }).catch(() => undefined);

    if (attempt.result === "success") {
      if (session) {
        const studentIdForEntry = session.studentId ?? session.userId;
        const currentEvents = getAttendanceEventsForStudent(studentIdForEntry);
        if (!getLatestOpenEntry(currentEvents)) {
          addAttendanceEvent(createEntryEvent(session, attempt, facility));
        }

        const nextSession = {
          ...session,
          lastBiometricVerificationAt: attempt.timestamp,
          lastBiometricMethod: attempt.method,
          facilityEntryGrantedAt: session.role === "inmate" ? attempt.timestamp : session.facilityEntryGrantedAt,
          facilityEntryMethod: session.role === "inmate" ? attempt.method : session.facilityEntryMethod,
          facilitySessionId:
            session.role === "inmate"
              ? `FAC-${studentIdForEntry}-${attempt.timestamp.slice(0, 19).replace(/[:T-]/g, "")}`
              : session.facilitySessionId,
          facilityLocation: session.role === "inmate" ? facility : session.facilityLocation,
          allocatedDeviceType: session.role === "inmate" ? allocatedDeviceType : session.allocatedDeviceType,
        };

        setActiveSession(nextSession);
      }
    }
  }

  const continuePath = nextPath || roleHomePath(session?.role ?? "inmate");

  return (
    <div className="portal-root" style={{ display: "grid", placeItems: "center" }}>
      <div className="panel" style={{ width: "min(760px, 100%)" }}>
        <div className="inline-row" style={{ justifyContent: "flex-start", gap: 10, marginBottom: 6 }}>
          <BrandLogo size={42} />
          <h1 style={{ marginBottom: 0 }}>Identity Verification</h1>
        </div>
        <p className="quick-info" style={{ marginBottom: 16 }}>
          Identity verification required before system access.
        </p>
        {reason === "entry" ? (
          <p className="status-bad" style={{ marginBottom: 12 }}>
            Facility entry authorization is required before opening inmate learning pages.
          </p>
        ) : null}
        {!session ? (
          <p className="status-bad" style={{ marginBottom: 12 }}>
            Session not found. Please sign in again to continue.
          </p>
        ) : null}

        <section className="verification-shell">
          <div className="panel verification-workflow">
            <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Verification Method</h2>
            <div className="panel" style={{ marginBottom: 12, padding: 12 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Facility and Device Assignment</p>
              <div className="grid-2">
                <label>
                  Facility
                  <select className="select" value={facility} onChange={(event) => setFacility(event.target.value as (typeof facilityOptions)[number])}>
                    {facilityOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Allocated Device
                  <select
                    className="select"
                    value={allocatedDeviceType}
                    onChange={(event) => setAllocatedDeviceType(event.target.value as (typeof deviceOptions)[number])}
                  >
                    {deviceOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="quick-info" style={{ margin: "8px 0 0" }}>
                Assignment is logged with biometric verification for attendance, device usage, and security reporting.
              </p>
            </div>
            <div className="grid-2">
              <button
                type="button"
                className={method === "fingerprint" ? "button-primary" : "button-soft"}
                onClick={() => setMethod("fingerprint")}
              >
                Fingerprint Authentication
              </button>
              <button
                type="button"
                className={method === "face" ? "button-primary" : "button-soft"}
                onClick={() => setMethod("face")}
              >
                Facial Recognition Scan
              </button>
            </div>

            {method === "face" ? (
              <div className="panel" style={{ marginTop: 12, padding: 12 }}>
                <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Facial Capture</p>
                <div className={`biometric-preview biometric-preview-face ${faceCapturedAt ? "biometric-preview-ready" : ""}`}>
                  {faceSnapshotDataUrl ? (
                    <div className="biometric-preview-snapshot" style={{ backgroundImage: `url(${faceSnapshotDataUrl})` }} />
                  ) : faceCameraActive ? (
                    <video ref={faceVideoRef} className="biometric-preview-video" autoPlay muted playsInline />
                  ) : (
                    <Image
                      src="/assets/education/hero-library.jpg"
                      alt="Face capture preview"
                      fill
                      className="biometric-preview-image"
                      sizes="(max-width: 760px) 100vw, 50vw"
                    />
                  )}
                  <span className="biometric-scan-line" aria-hidden />
                </div>
                <div className="biometric-control-row">
                  <button type="button" className="button-soft" onClick={() => void startFaceCamera()}>
                    Start Camera
                  </button>
                  <button type="button" className="button-soft" onClick={captureFace}>
                    Capture Face
                  </button>
                  <button type="button" className="button-soft" onClick={stopFaceCamera} disabled={!faceCameraActive}>
                    Stop Camera
                  </button>
                </div>
                {faceCapturedAt ? <p className="status-ok">{`Face captured ${formatDateTime(faceCapturedAt)}`}</p> : null}
                {faceCameraError ? <p className="quick-info" style={{ margin: 0 }}>{faceCameraError}</p> : null}
                <p className="quick-info" style={{ margin: "4px 0 0" }}>
                  {strictBiometricMode ? "Strict mode: live face capture required." : "Fallback mode: simulated face proof allowed."}
                </p>
              </div>
            ) : (
              <div className="panel" style={{ marginTop: 12, padding: 12 }}>
                <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Device Biometric</p>
                <p className="quick-info" style={{ marginTop: 0 }}>
                  {deviceBiometricSupported
                    ? "Use built-in phone/tablet biometric (Face ID, Touch ID, Android Biometric)."
                    : "Built-in device biometric not supported here; fallback biometric proof available."}
                </p>
                <p className="quick-info" style={{ margin: "0 0 8px" }}>
                  Active adapter: {hardwareBiometricAdapter.label}
                </p>
                <button
                  type="button"
                  className="button-soft"
                  onClick={() => void triggerDeviceBiometric()}
                  disabled={deviceBiometricBusy}
                >
                  {deviceBiometricBusy ? "Waiting for Device..." : "Use Device Biometric"}
                </button>
                {deviceBiometricAt ? <p className="status-ok">{`Biometric confirmed ${formatDateTime(deviceBiometricAt)}`}</p> : null}
                {deviceBiometricMessage ? <p className="quick-info" style={{ margin: "6px 0 0" }}>{deviceBiometricMessage}</p> : null}
                <p className="quick-info" style={{ margin: "6px 0 0" }}>
                  {strictBiometricMode ? "Strict mode: biometric prompt must succeed." : "Fallback mode: simulated proof allowed."}
                </p>
              </div>
            )}

            <div className="inline-row" style={{ marginTop: 16, justifyContent: "flex-start" }}>
              <button type="button" className="button-primary" onClick={runVerification} data-testid="verify-identity-btn">
                Run Secure Verification
              </button>
              {result === "success" ? <span className="status-ok">Verification successful</span> : null}
              {result === "failed" ? <span className="status-bad">Verification failed. Retry required.</span> : null}
            </div>
          </div>

          <div className="panel verification-visual">
            <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Biometric Scanner</h2>
            <div
              key={scanCount}
              className={`verification-stage verification-stage-${method} ${
                result ? `verification-stage-${result}` : ""
              }`}
            >
              <span className="verification-beam" aria-hidden />
              <p>{method === "face" ? "Facial Frame Active" : "Fingerprint Sensor Active"}</p>
            </div>
            <p className="quick-info" style={{ margin: "10px 0 0" }}>
              Device: {lastAttempt?.deviceId ?? "lab-terminal-01"}
            </p>
            <p className="quick-info" style={{ margin: "4px 0 0" }}>
              Assigned terminal: {allocatedDeviceType} at {facility}
            </p>
            <p className="quick-info" style={{ margin: "4px 0 0" }}>
              Last scan: {lastAttempt ? formatDateTime(lastAttempt.timestamp) : "No attempts yet"}
            </p>
            {method === "face" ? (
              <p className="quick-info" style={{ margin: "4px 0 0" }}>
                Face proof: {faceCapturedAt ? "Captured" : "Not captured"}
              </p>
            ) : (
              <p className="quick-info" style={{ margin: "4px 0 0" }}>
                Device proof: {deviceBiometricAt ? "Confirmed" : "Not confirmed"}
              </p>
            )}
          </div>
        </section>

        <div className="panel" style={{ marginTop: 16 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Recent Verification Logs</p>
          <div style={{ display: "grid", gap: 8 }}>
            {logs.slice(0, 5).map((entry) => (
              <div key={`${entry.timestamp}-${entry.method}`} className="inline-row">
                <span>
                  {entry.method} - {entry.result}
                </span>
                <span className="quick-info">{formatDateTime(entry.timestamp)}</span>
              </div>
            ))}
            {logs.length === 0 ? <p className="quick-info">No verification events yet.</p> : null}
          </div>
        </div>

        <div className="inline-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="button-primary"
            disabled={result !== "success" || !session}
            onClick={() => router.push(continuePath)}
          >
            Continue to Portal
          </button>
        </div>
      </div>
    </div>
  );
}
