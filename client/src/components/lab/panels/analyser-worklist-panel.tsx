"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  TestTube,
  PhoneCall,
  Check,
  X,
  Barcode,
  TriangleAlert,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  Card,
  LiveDot,
  Pill,
  StatGrid,
  Td,
  Th,
  type Tone,
} from "@/components/workspace/ui";
import {
  fetchLabAnalysersApi,
  fetchLabSamplesApi,
  fetchLabAnalytesApi,
  createLabAnalyserApi,
  updateLabAnalyserApi,
  rotateLabAnalyserTokenApi,
  recordLabAnalyserQCApi,
  assignLabAnalyserWorklistApi,
  saveLabAnalyteApi,
  submitLabResultsApi,
} from "@/lib/api/lab";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

/** Animated tube-rack glyph — hand-drawn SVG, no raster assets. */
function RackGlyph({ tubes }: { tubes: { colour: string; count: number }[] }) {
  const flat = tubes
    .flatMap((t) => Array.from({ length: t.count }, () => t.colour))
    .slice(0, 8);
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-full">
      <line
        x1="4"
        y1="42"
        x2="116"
        y2="42"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      {flat.map((c, i) => (
        <g key={i}>
          <rect
            x={8 + i * 13}
            y="10"
            width="8"
            height="30"
            fill="none"
            stroke="var(--hairline)"
          />
          <motion.rect
            x={8 + i * 13}
            width="8"
            fill={c}
            opacity="0.7"
            initial={{ y: 40, height: 0 }}
            animate={{ y: 24, height: 16 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
          />
        </g>
      ))}
    </svg>
  );
}

/* ---------- 03 analyser worklist ---------- */

export function AnalyserPanel() {
  const [analysers, setAnalysers] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [analytes, setAnalytes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAnalyser, setNewAnalyser] = useState({ name: "", discipline: "" });
  const [integrationToken, setIntegrationToken] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<
    Record<string, string[]>
  >({});
  const [controlLots, setControlLots] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [manualOrder, setManualOrder] = useState<any | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualResults, setManualResults] = useState([
    { analyteCode: "", value: "" },
  ]);
  const [analyteForm, setAnalyteForm] = useState({
    code: "",
    name: "",
    unit: "",
    referenceLow: "",
    referenceHigh: "",
    criticalLow: "",
    criticalHigh: "",
    deltaPercent: "",
  });

  const loadData = async () => {
    try {
      const [analyserRes, sampleRes, analyteRes] = await Promise.all([
        fetchLabAnalysersApi(),
        fetchLabSamplesApi(),
        fetchLabAnalytesApi(),
      ]);
      setAnalysers(analyserRes.analysers || []);
      setSamples(sampleRes.samples || []);
      setAnalytes(analyteRes.analytes || []);
    } catch (e) {
      toast.error("Failed to load analyser worklists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();
    if (socket) {
      socket.on("lab_analyser_updated", loadData);
      socket.on("lab_collection_updated", loadData);
      socket.on("lab_results_imported", loadData);
      return () => {
        socket.off("lab_analyser_updated", loadData);
        socket.off("lab_collection_updated", loadData);
        socket.off("lab_results_imported", loadData);
      };
    }
  }, []);

  const createAnalyser = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyId("new");
    try {
      const result = await createLabAnalyserApi(newAnalyser);
      setIntegrationToken(result.integrationToken);
      setNewAnalyser({ name: "", discipline: "" });
      toast.success("Analyser added. Copy its integration token now.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to add analyser.");
    } finally {
      setBusyId(null);
    }
  };

  const recordQC = async (analyserId: string, passed: boolean) => {
    const controlLot = controlLots[analyserId]?.trim();
    if (!controlLot)
      return toast.error("Enter the control lot before recording QC.");
    setBusyId(analyserId);
    try {
      await recordLabAnalyserQCApi(analyserId, { passed, controlLot });
      toast.success(
        passed
          ? "QC pass recorded."
          : "QC failure recorded; imports are blocked.",
      );
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to record QC.");
    } finally {
      setBusyId(null);
    }
  };

  const assignWorklist = async (analyserId: string) => {
    const orderIds = selectedOrders[analyserId] || [];
    if (!orderIds.length)
      return toast.error("Select received specimens for this analyzer.");
    setBusyId(analyserId);
    try {
      const result = await assignLabAnalyserWorklistApi(analyserId, orderIds);
      toast.success(`${result.assigned} specimen(s) assigned.`);
      setSelectedOrders((previous) => ({ ...previous, [analyserId]: [] }));
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to assign specimens.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const rotateToken = async (analyserId: string) => {
    try {
      const result = await rotateLabAnalyserTokenApi(analyserId);
      setIntegrationToken(result.integrationToken);
      toast.success("New token created. The previous token is invalid now.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to rotate token.");
    }
  };

  const submitManual = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualOrder) return;
    try {
      await submitLabResultsApi(
        manualOrder._id,
        manualBarcode,
        manualResults.map((row) => ({
          analyteCode: row.analyteCode,
          value: Number(row.value),
        })),
      );
      toast.success("Structured results saved to validation.");
      setManualOrder(null);
      setManualBarcode("");
      setManualResults([{ analyteCode: "", value: "" }]);
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to save manual results.",
      );
    }
  };

  const saveAnalyte = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await saveLabAnalyteApi({ ...analyteForm });
      setAnalyteForm({
        code: "",
        name: "",
        unit: "",
        referenceLow: "",
        referenceHigh: "",
        criticalLow: "",
        criticalHigh: "",
        deltaPercent: "",
      });
      toast.success("Analyte and reference limits saved.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to save analyte.");
    }
  };

  return (
    <section>
      <PanelHeader
        index="03 / bench"
        title="Analyser worklist"
        note="Assign received barcoded samples, enforce current QC, record manual results, or connect an instrument through the token-authenticated JSON result endpoint."
      />

      <form
        onSubmit={createAnalyser}
        className="mb-5 grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input
          required
          aria-label="Analyzer name"
          value={newAnalyser.name}
          onChange={(event) =>
            setNewAnalyser((previous) => ({
              ...previous,
              name: event.target.value,
            }))
          }
          placeholder="Analyzer name"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          required
          aria-label="Analyzer discipline"
          value={newAnalyser.discipline}
          onChange={(event) =>
            setNewAnalyser((previous) => ({
              ...previous,
              discipline: event.target.value,
            }))
          }
          placeholder="Discipline, e.g. Hematology"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <ActionButton type="submit" tone="solid" disabled={busyId === "new"}>
          Add analyzer
        </ActionButton>
      </form>

      {integrationToken && (
        <div className="mb-5 break-all rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <strong>Copy this integration token now.</strong> It is shown once and
          stored only as a hash.
          <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs">
            {integrationToken}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            POST /api/v1/lab/integration/analysers/&lt;analyserId&gt;/results ·
            Authorization: Bearer &lt;token&gt; · JSON: &#123; barcode, results:
            [&#123; analyteCode, value, externalResultId &#125;] &#125;
          </p>
        </div>
      )}

      <div
        className="grid gap-px lg:grid-cols-2"
        style={{ background: "var(--hairline)" }}
      >
        {loading ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-2">
            Loading analysers...
          </div>
        ) : analysers.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-2">
            No analysers configured.
          </div>
        ) : (
          analysers.map((a) => {
            const receivedSamples = samples.filter(
              (sample) => sample.specimenStatus === "RECEIVED",
            );
            const assignedSamples = samples.filter(
              (sample) =>
                String(sample.analyser?._id || sample.analyser) ===
                  String(a._id) &&
                ["PROCESSING", "RECEIVED"].includes(sample.specimenStatus),
            );
            const selected = selectedOrders[a._id] || [];
            return (
              <div key={a._id} className="space-y-4 bg-background p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="mono-label text-accent/80">
                      {a._id.slice(-6).toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold">{a.name}</p>
                    <p className="mono-label text-muted-foreground">
                      {a.discipline}
                    </p>
                  </div>
                  <Pill
                    tone={
                      a.connectionState === "ONLINE"
                        ? "ok"
                        : a.connectionState === "MAINTENANCE"
                          ? "warn"
                          : "mute"
                    }
                  >
                    {a.connectionState || "OFFLINE"}
                  </Pill>
                </div>

                <svg viewBox="0 0 200 56" className="h-14 w-full">
                  <rect
                    x="2"
                    y="8"
                    width="196"
                    height="40"
                    fill="none"
                    stroke="var(--hairline)"
                  />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <rect
                      key={i}
                      x={10 + i * 15}
                      y="18"
                      width="8"
                      height="20"
                      fill="none"
                      stroke="var(--hairline)"
                    />
                  ))}
                </svg>

                <dl className="mono-label space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Queue</dt>
                    <dd>{a.queue} assigned</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">QC status</dt>
                    <dd
                      className={
                        a.qcExpired || a.qcStatus !== "PASS"
                          ? "text-destructive"
                          : "text-emerald-600"
                      }
                    >
                      {a.qcExpired ? "Expired or due" : a.qcStatus}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Last QC pass</dt>
                    <dd>
                      {a.qcLastPassedAt
                        ? new Date(a.qcLastPassedAt).toLocaleString()
                        : "Never"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      Last device message
                    </dt>
                    <dd>
                      {a.lastSeenAt
                        ? new Date(a.lastSeenAt).toLocaleString()
                        : "No imports yet"}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    onClick={() =>
                      updateLabAnalyserApi(a._id, {
                        connectionState:
                          a.connectionState === "ONLINE" ? "OFFLINE" : "ONLINE",
                      })
                        .then(loadData)
                        .catch(() =>
                          toast.error("Unable to change analyzer state"),
                        )
                    }
                  >
                    {a.connectionState === "ONLINE"
                      ? "Set offline"
                      : "Set online"}
                  </ActionButton>
                  <ActionButton onClick={() => rotateToken(a._id)}>
                    Rotate device token
                  </ActionButton>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <h4 className="mb-2 text-sm font-semibold">
                    Quality control
                  </h4>
                  <input
                    value={controlLots[a._id] || ""}
                    onChange={(event) =>
                      setControlLots((previous) => ({
                        ...previous,
                        [a._id]: event.target.value,
                      }))
                    }
                    placeholder="Control lot number"
                    className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <ActionButton
                      tone="solid"
                      disabled={busyId === a._id}
                      onClick={() => recordQC(a._id, true)}
                    >
                      Record pass
                    </ActionButton>
                    <ActionButton
                      disabled={busyId === a._id}
                      onClick={() => recordQC(a._id, false)}
                    >
                      Record fail
                    </ActionButton>
                  </div>
                  <ol className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {(a.qcRuns || [])
                      .slice(-3)
                      .reverse()
                      .map((run: any, index: number) => (
                        <li key={`${run.performedAt}-${index}`}>
                          {run.passed ? "PASS" : "FAIL"} · Lot {run.controlLot}{" "}
                          · {new Date(run.performedAt).toLocaleString()}
                        </li>
                      ))}
                  </ol>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <h4 className="mb-2 text-sm font-semibold">
                    Assign received samples
                  </h4>
                  {receivedSamples.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No specimens received and awaiting assignment.
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {receivedSamples.map((sample) => (
                        <label
                          key={sample._id}
                          className="flex items-start gap-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(sample._id)}
                            onChange={(event) =>
                              setSelectedOrders((previous) => ({
                                ...previous,
                                [a._id]: event.target.checked
                                  ? [...selected, sample._id]
                                  : selected.filter((id) => id !== sample._id),
                              }))
                            }
                          />
                          <span>
                            <strong>{sample.patient?.name || "Patient"}</strong>{" "}
                            · {sample.testName}
                            <span className="block font-mono text-muted-foreground">
                              {sample.specimenBarcode}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <ActionButton
                    className="mt-3"
                    tone="solid"
                    disabled={busyId === a._id || selected.length === 0}
                    onClick={() => assignWorklist(a._id)}
                  >
                    Assign selected
                  </ActionButton>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <h4 className="mb-2 text-sm font-semibold">
                    Assigned worklist
                  </h4>
                  {assignedSamples.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No samples assigned.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {assignedSamples.map((sample) => (
                        <li
                          key={sample._id}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <span>
                            {sample.testName} ·{" "}
                            <span className="font-mono">
                              {sample.specimenBarcode}
                            </span>
                          </span>
                          <ActionButton
                            onClick={() => {
                              setManualOrder(sample);
                              setManualBarcode("");
                              setManualResults([
                                { analyteCode: "", value: "" },
                              ]);
                            }}
                          >
                            Enter manually
                          </ActionButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {manualOrder && (
        <form
          onSubmit={submitManual}
          className="mt-5 rounded-xl border border-primary/30 bg-background p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                Manual result entry · {manualOrder.testName}
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                Expected barcode: {manualOrder.specimenBarcode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setManualOrder(null)}
              aria-label="Close manual entry"
            >
              ×
            </button>
          </div>
          <input
            required
            value={manualBarcode}
            onChange={(event) =>
              setManualBarcode(event.target.value.toUpperCase())
            }
            placeholder="Scan specimen barcode"
            className="mb-3 w-full rounded-md border border-border px-3 py-2 font-mono text-sm"
          />
          {manualResults.map((row, index) => (
            <div key={index} className="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr]">
              <select
                required
                value={row.analyteCode}
                onChange={(event) =>
                  setManualResults((previous) =>
                    previous.map((item, i) =>
                      i === index
                        ? { ...item, analyteCode: event.target.value }
                        : item,
                    ),
                  )
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Choose analyte</option>
                {analytes
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name} ({item.code}) · {item.unit}
                    </option>
                  ))}
              </select>
              <input
                required
                type="number"
                step="any"
                value={row.value}
                onChange={(event) =>
                  setManualResults((previous) =>
                    previous.map((item, i) =>
                      i === index
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="Result value"
                className="rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <ActionButton
              type="button"
              onClick={() =>
                setManualResults((previous) => [
                  ...previous,
                  { analyteCode: "", value: "" },
                ])
              }
            >
              Add analyte
            </ActionButton>
            <ActionButton type="submit" tone="solid">
              Save all results for validation
            </ActionButton>
          </div>
        </form>
      )}

      <form
        onSubmit={saveAnalyte}
        className="mt-5 rounded-xl border border-border bg-background p-4"
      >
        <h3 className="mb-3 font-semibold">
          Analyte definitions and reference limits
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Configure ranges approved for your lab. Results without configured
          limits are marked unreviewed and require a reviewer.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["code", "Code"],
              ["name", "Analyte name"],
              ["unit", "Unit"],
              ["referenceLow", "Ref low"],
              ["referenceHigh", "Ref high"],
              ["criticalLow", "Critical low"],
              ["criticalHigh", "Critical high"],
              ["deltaPercent", "Delta alert %"],
            ] as const
          ).map(([key, label]) => (
            <input
              key={key}
              required={["code", "name", "unit"].includes(key)}
              type={
                key.includes("Low") ||
                key.includes("High") ||
                key === "deltaPercent"
                  ? "number"
                  : "text"
              }
              step="any"
              value={analyteForm[key]}
              onChange={(event) =>
                setAnalyteForm((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
              placeholder={label}
              aria-label={label}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          ))}
        </div>
        <ActionButton type="submit" className="mt-3" tone="solid">
          Save analyte definition
        </ActionButton>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {analytes.map((item) => (
            <li key={item.code} className="rounded-md bg-muted/30 p-2 text-xs">
              <strong>{item.name}</strong> · {item.code} ·{" "}
              {item.referenceLow ?? "?"}–{item.referenceHigh ?? "?"} {item.unit}{" "}
              · critical {item.criticalLow ?? "—"}/{item.criticalHigh ?? "—"} ·
              delta alert {item.deltaPercent ? `${item.deltaPercent}%` : "off"}
            </li>
          ))}
        </ul>
      </form>
    </section>
  );
}
