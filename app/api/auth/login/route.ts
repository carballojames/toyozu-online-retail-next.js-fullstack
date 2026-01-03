import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyDjangoPbkdf2(password: string, encoded: string): boolean {
  // Django format: pbkdf2_sha256$iterations$salt$hash
  const parts = encoded.split("$");
  if (parts.length !== 4) return false;

  const [algorithm, iterationsRaw, salt, hashB64] = parts;
  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const digest =
    algorithm === "pbkdf2_sha256" ? "sha256" : algorithm === "pbkdf2_sha1" ? "sha1" : null;
  if (!digest) return false;

  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, digest);

  // Django stores the derived key as base64.
  const stored = Buffer.from(hashB64, "base64");
  // Some existing DBs may store key length != 32; derive to stored length if needed.
  if (stored.length !== derived.length) {
    const derivedAlt = crypto.pbkdf2Sync(password, salt, iterations, stored.length, digest);
    return safeEqual(derivedAlt, stored);
  }
  return safeEqual(derived, stored);
}

function verifyPassword(password: string, storedPassword: string): { ok: boolean; reason?: string } {
  // Plain-text fallback (common in demos). If your DB stores hashed passwords, prefer hashing.
  if (!storedPassword.includes("$")) {
    return { ok: password === storedPassword };
  }

  // Raw bcrypt hashes often start with "$2a$", "$2b$", or "$2y$".
  if (/^\$2[aby]\$\d\d\$/.test(storedPassword)) {
    return { ok: bcrypt.compareSync(password, storedPassword) };
  }

  // Some systems prefix the scheme, e.g. "bcrypt$<bcrypt-hash>".
  if (storedPassword.startsWith("bcrypt$")) {
    const bcryptHash = storedPassword.slice("bcrypt$".length);
    return { ok: bcrypt.compareSync(password, bcryptHash) };
  }

  // Django BCryptSHA256PasswordHasher: "bcrypt_sha256$<bcrypt-hash>" where bcrypt hashes
  // a SHA256 digest of the password.
  if (storedPassword.startsWith("bcrypt_sha256$")) {
    const sha256Hex = crypto.createHash("sha256").update(password, "utf8").digest("hex");
    const sha256Base64 = crypto.createHash("sha256").update(password, "utf8").digest("base64");

    // Example format seen in Postgres: "bcrypt_sha256$$2b$12$...".
    let bcryptHash = storedPassword.slice("bcrypt_sha256$".length);
    if (bcryptHash.startsWith("$$2")) bcryptHash = bcryptHash.slice(1);
    if (!bcryptHash.startsWith("$") && bcryptHash.startsWith("2")) bcryptHash = `$${bcryptHash}`;

    // Django uses sha256 HEX digest as the bcrypt "password".
    if (bcrypt.compareSync(sha256Hex, bcryptHash)) return { ok: true };

    // Fallback: tolerate alternate encoding variants.
    return { ok: bcrypt.compareSync(sha256Base64, bcryptHash) };
  }

  const scheme = storedPassword.split("$")[0];
  if (scheme === "pbkdf2_sha256" || scheme === "pbkdf2_sha1") {
    return { ok: verifyDjangoPbkdf2(password, storedPassword) };
  }

  return { ok: false, reason: `Unsupported password scheme: ${scheme}` };
}

export async function POST(request: Request) {
  try {
    const body = loginSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid username/password" }, { status: 400 });
    }

    const { username, password } = body.data;

    const user = await prisma.user_employee.findUnique({
      where: { username },
      select: {
        user_id: true,
        username: true,
        user_name: true,
        role_id: true,
        is_superuser: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid username/password" }, { status: 401 });
    }

    const check = verifyPassword(password, user.password);
    if (!check.ok) {
      // Avoid leaking whether user exists; keep message generic.
      return NextResponse.json({ error: "Invalid username/password" }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        user_id: user.user_id,
        username: user.username,
        user_name: user.user_name,
        role_id: user.role_id,
        is_superuser: user.is_superuser,
      },
    });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
