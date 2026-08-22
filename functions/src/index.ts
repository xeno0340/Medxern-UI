/**
 * MedXern Firebase Cloud Function (v2) — Production (Approach B)
 *
 * ✅ Callable Function: generateTimelinePdf
 * - Auth required
 * - Lists ALL uploaded reports from Firebase Storage: reports/{uid}/*
 * - Downloads them in-memory
 * - Sends as multipart/form-data to Cloud Run wrapper: /export_pdf_from_files
 * - Receives PDF bytes
 * - Uploads timeline.pdf back to Storage: reports/{uid}/timeline.pdf
 * - Writes timelinePdfUrl + metadata to Firestore: users/{uid}
 * - Returns { ok, pdfUrl, reportCount, storagePath }
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString, defineSecret } from "firebase-functions/params";

import axios from "axios";
import FormData from "form-data";

// IMPORTANT: import admin as a module (no init at top-level)
import * as admin from "firebase-admin";

/* ======================================================
   GLOBAL SETTINGS
====================================================== */
setGlobalOptions({
  region: "asia-south1",
  maxInstances: 10,
});

/* ======================================================
   SAFE ADMIN INIT (no heavy work at import time)
====================================================== */
function ensureAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin;
}

/* ======================================================
   TEST FUNCTION (Ping)
====================================================== */
export const ping = onRequest((req, res) => {
  res.status(200).send("pong ✅ MedXern Functions working!");
});

/* ======================================================
   WRAPPER CONFIG
====================================================== */
const WRAPPER_BASE_URL = defineString("MEDXERN_WRAPPER_BASE_URL", {
  default: "https://medxern-wrapper-714043644019.asia-south1.run.app",
});

const WRAPPER_SECRET = defineSecret("MEDXERN_WRAPPER_SECRET");

/* ======================================================
   HELPERS
====================================================== */
function ensureAuth(request: any): string {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }
  return request.auth.uid as string;
}

function normalizeBaseUrl(url: string): string {
  return (url || "").replace(/\/+$/, "");
}

function isAllowedReportFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp")
  );
}

/**
 * Token-based Firebase Storage URL (stable; not signed; does not expire)
 */
function createTokenDownloadUrl(bucketName: string, objectPath: string, token: string) {
  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

/* ======================================================
   MAIN FUNCTION (Approach B)
====================================================== */
export const generateTimelinePdf = onCall(
  {
    secrets: [WRAPPER_SECRET],
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (request) => {
    const uid = ensureAuth(request);

    const baseUrl = normalizeBaseUrl(WRAPPER_BASE_URL.value());
    const secret = WRAPPER_SECRET.value();

    if (!baseUrl) {
      throw new HttpsError("failed-precondition", "Missing MEDXERN_WRAPPER_BASE_URL.");
    }
    if (!secret) {
      throw new HttpsError("failed-precondition", "Missing MEDXERN_WRAPPER_SECRET.");
    }

    const adm = ensureAdmin();
    const db = adm.firestore();
    const bucket = adm.storage().bucket();
    const bucketName = bucket.name;

    // Storage pattern: reports/{uid}/...
    const reportsPrefix = `reports/${uid}/`;
    const outputPdfPath = `reports/${uid}/timeline.pdf`;

    // 1) List report files in Storage
    const [all] = await bucket.getFiles({ prefix: reportsPrefix });

    const reportFiles = all.filter((f) => {
      const name = f.name;
      if (!name.startsWith(reportsPrefix)) return false;
      if (name === outputPdfPath) return false;
      if (name.endsWith("/")) return false;
      return isAllowedReportFile(name);
    });

    if (reportFiles.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        `No supported report files found under ${reportsPrefix}`
      );
    }

    // 2) Build multipart form-data
    const form = new FormData();

    // In-memory download
    for (const f of reportFiles) {
      const [buf] = await f.download();
      const filename = f.name.split("/").pop() || "report";
      form.append("files", buf, { filename });
    }

    // 3) Call Cloud Run wrapper to generate PDF
    let pdfBytes: Buffer;

    try {
      const response = await axios.post(`${baseUrl}/export_pdf_from_files`, form, {
        headers: {
          ...form.getHeaders(),
          "X-Wrapper-Secret": secret, // wrapper reads this header
          accept: "application/pdf",
        },
        responseType: "arraybuffer",
        timeout: 240000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      pdfBytes = Buffer.from(response.data);
      if (!pdfBytes || pdfBytes.length < 1000) {
        throw new Error("Wrapper returned empty/too-small PDF.");
      }
    } catch (err: any) {
      const status = err?.response?.status;
      let detail = err?.message || "Unknown wrapper error";

      if (err?.response?.data) {
        try {
          detail = Buffer.from(err.response.data).toString("utf-8").slice(0, 1500);
        } catch {
          // ignore
        }
      }

      throw new HttpsError(
        "internal",
        `Wrapper call failed${status ? ` (HTTP ${status})` : ""}: ${detail}`
      );
    }

    // 4) Upload PDF to Storage with a stable download token
    const token =
      (globalThis.crypto as any)?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const outFile = bucket.file(outputPdfPath);

    await outFile.save(pdfBytes, {
      resumable: false,
      contentType: "application/pdf",
      metadata: {
        cacheControl: "private, max-age=0, no-transform",
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const pdfUrl = createTokenDownloadUrl(bucketName, outputPdfPath, token);

    // 5) Write to Firestore
    await db.doc(`users/${uid}`).set(
      {
        timelinePdfUrl: pdfUrl,
        timelinePdfPath: outputPdfPath,
        timelinePdfUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        timelinePdfSourceCount: reportFiles.length,
      },
      { merge: true }
    );

    // 6) Return
    return {
      ok: true,
      pdfUrl,
      storagePath: outputPdfPath,
      reportCount: reportFiles.length,
    };
  }
);
