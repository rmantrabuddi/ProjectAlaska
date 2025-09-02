// server/index.ts
import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import { z } from "zod";

const app = express();
app.use(express.json({ limit: "20mb" }));

// ----- Env -------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // server-side only

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in .env");
  process.exit(1);
}

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// ----- Health ----------------------------------------------------------------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ----- Validation -------------------------------------------------------------
const InventoryRow = z.object({
  department_id: z.string().uuid().optional().or(z.literal("")).optional(),
  department_name: z.string(),
  division: z.string().optional().default(""),
  license_permit_type: z.string(),
  description: z.string().optional().default(""),
  // Optional extra fields often present in your sheet
  access_mode: z.string().optional(),
  regulations: z.string().optional(),
  user_type: z.string().optional(),
  cost: z.string().optional(),

  revenue_2023: z.number().nullable().optional(),
  revenue_2024: z.number().nullable().optional(),
  revenue_2025: z.number().nullable().optional(),
  processing_time_2023: z.number().nullable().optional(),
  processing_time_2024: z.number().nullable().optional(),
  processing_time_2025: z.number().nullable().optional(),
  volume_2023: z.number().int().nullable().optional(),
  volume_2024: z.number().int().nullable().optional(),
  volume_2025: z.number().int().nullable().optional(),
  status: z.string().optional().default(""),
});
const BulkPayload = z.object({ rows: z.array(InventoryRow).min(1) });

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ----- Supabase bulk insert (service role; bypasses RLS) ---------------------
app.post("/api/inventory/bulk", async (req, res) => {
  try {
    const { rows } = BulkPayload.parse(req.body);

    const clean = rows.map((r) => {
      const c: any = { ...r };
      [
        "department_name",
        "division",
        "license_permit_type",
        "description",
        "access_mode",
        "regulations",
        "user_type",
        "cost",
        "status",
      ].forEach((k) => {
        if (c[k] != null) c[k] = String(c[k]).trim();
      });
      if (!c.department_id) delete c.department_id;
      return c;
    });

    const batches = chunk(clean, 1000);
    const inserted: any[] = [];

    for (const b of batches) {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/inventory_data`, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE!,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(b),
      });

      const text = await resp.text();
      if (!resp.ok) {
        return res.status(resp.status).json({
          error: "supabase_insert_failed",
          status: resp.status,
          detail: text,
        });
      }
      inserted.push(...(text ? JSON.parse(text) : []));
    }

    res.json({ insertedCount: inserted.length, rows: inserted });
  } catch (err: any) {
    if (err?.issues) {
      return res.status(400).json({ error: "validation_error", detail: err.issues });
    }
    res.status(500).json({ error: "server_error", detail: String(err) });
  }
});

// ----- Supabase read-through (service role; avoids client SELECT policy) -----
app.get("/api/inventory", async (req, res) => {
  const { department, division, licenseType, limit = "5000" } = req.query as Record<string, string>;
  const url = new URL(`${SUPABASE_URL}/rest/v1/inventory_data`);
  url.searchParams.set("select", "*");
  url.searchParams.set("limit", String(limit));
  if (department) url.searchParams.set("department_name", `eq.${department}`);
  if (division) url.searchParams.set("division", `eq.${division}`);
  if (licenseType) url.searchParams.set("license_permit_type", `eq.${licenseType}`);

  const resp = await fetch(url, {
    headers: { apikey: SERVICE_ROLE!, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  const text = await resp.text();
  if (!resp.ok) return res.status(resp.status).json({ error: "supabase_select_failed", detail: text });
  res.type("application/json").send(text);
});

// ----- OpenAI proxy & interview extraction -----------------------------------
const ChatMessage = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
const ChatCompletionRequest = z.object({
  model: z.string().default("gpt-4o-mini"),
  messages: z.array(ChatMessage),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  response_format: z.object({ type: z.string() }).optional(),
});

// Simpler shape used by InterviewNotes upload: { text, meta }
const ExtractInterviewRequest = z.object({
  text: z.string().min(1),
  meta: z
    .object({
      department_name: z.string().optional(),
      division: z.string().optional(),
      interview_date: z.string().optional(), // ISO preferred
      duration_minutes: z.number().optional(),
    })
    .partial()
    .optional(),
});

app.post("/api/ai/chat-completion", async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({
        error: "openai_not_configured",
        detail: "OPENAI_API_KEY is not set on the server",
      });
    }

    // 1) If the client posted a raw Chat Completions payload, proxy it as-is
    if (Array.isArray(req.body?.messages)) {
      const data = ChatCompletionRequest.parse(req.body);
      const completion = await openai.chat.completions.create(data);
      return res.json(completion);
    }

    // 2) Otherwise treat this as an interview extraction request: { text, meta }
    const { text, meta } = ExtractInterviewRequest.parse(req.body);

    const prompt = [
      "You are an analyst. Read the interview notes and extract the following fields:",
      "- department_name (string)",
      "- division (string)",
      "- interview_date (ISO if present)",
      "- duration_minutes (integer if present)",
      "- summary (<= 120 words)",
      "- key_insights (array of short bullet strings)",
      "- challenges (array of short bullet strings)",
      "- opportunities (array of short bullet strings)",
      "- recommendations (array of short bullet strings)",
      "",
      "Return a single STRICT JSON object with exactly those keys.",
      "",
      "Interview notes:",
      text,
      "",
      "User-provided meta (may override if obviously wrong):",
      JSON.stringify(meta ?? {}),
    ].join("\n");

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = resp.choices?.[0]?.message?.content ?? "{}";
    let json: any;
    try {
      json = JSON.parse(content);
    } catch {
      json = { summary: content }; // fallback if model didn't honor json mode
    }
    return res.json(json);
  } catch (err: any) {
    console.error("[/api/ai/chat-completion] error:", err?.response?.data ?? err);
    if (err?.issues) {
      return res.status(400).json({ error: "validation_error", detail: err.issues });
    }
    if (err?.status) {
      return res.status(err.status).json({
        error: "openai_api_error",
        detail: err.message || "OpenAI API request failed",
        status: err.status,
      });
    }
    return res.status(500).json({ error: "server_error", detail: String(err?.message ?? err) });
  }
});

// ----- Start -----------------------------------------------------------------
const port = Number(process.env.PORT || 8787);
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 API server listening on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});