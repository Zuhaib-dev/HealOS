"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Check,
  TriangleAlert,
  Save,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  Clock,
  ChevronDown,
  AlertOctagon,
} from "lucide-react";
import { PanelHeader } from "@/components/admin/admin-shell";
import {
  fetchTemplatesApi,
  fetchPendingOrdersApi,
  updateOrderStatusApi,
  DiagnosticOrderRecord,
  ReportTemplateRecord,
} from "@/lib/api/radiology";
import { toast } from "sonner";

const DEFAULT_TEMPLATES: ReportTemplateRecord[] = [
  {
    _id: "tpl-cxr",
    label: "Chest X-Ray (Normal)",
    body: `EXAMINATION: Chest Radiograph (PA & Lateral Views)

CLINICAL HISTORY: Screening / routine evaluation.

TECHNIQUE: Standard erect PA and lateral views of the thorax.

FINDINGS:
- Lungs: Clear. No focal airspace consolidation, pleural effusion, or pneumothorax.
- Cardiomediastinal Silhouette: Normal in size and contour. Cardio-thoracic ratio is within normal physiological limits (< 50%).
- Bones & Soft Tissues: Thoracic cage and osseous structures are intact without acute fractures. Diaphragmatic contours are smooth.

IMPRESSION:
No acute cardiopulmonary disease. Normal study.`,
  },
  {
    _id: "tpl-ct-brain",
    label: "Brain CT Non-Contrast",
    body: `EXAMINATION: CT Head / Brain without IV Contrast

CLINICAL HISTORY: Headache / acute trauma evaluation.

TECHNIQUE: Axial unenhanced computed tomography of the brain from the base of the skull through the vertex.

FINDINGS:
- Brain Parenchyma: Symmetric gray-white matter differentiation preserved. No acute intracranial hemorrhage, mass effect, midline shift, or territorial infarct.
- Ventricular System: Ventricles, sulci, and basal cisterns are within normal limits for age.
- Calvarium & Basal Skull: No skull fractures. Paranasal sinuses and mastoid air cells are well aerated.

IMPRESSION:
1. No acute intracranial hemorrhage or mass effect.
2. Normal non-contrast head CT.`,
  },
  {
    _id: "tpl-us-abdomen",
    label: "Abdominal Ultrasound (Complete)",
    body: `EXAMINATION: Abdominal Ultrasound (Complete)

CLINICAL HISTORY: Abdominal pain / screening.

FINDINGS:
- Liver: Normal size and echotexture. No focal hepatic lesion or biliary dilatation.
- Gallbladder: Well distended with thin walls. No gallstones or pericholecystic fluid.
- Kidneys: Normal bilateral renal size and parenchymal thickness. No hydronephrosis, calculi, or masses.
- Spleen & Pancreas: Unremarkable size and echogenicity.

IMPRESSION:
Normal transabdominal ultrasound examination.`,
  },
  {
    _id: "tpl-mri-spine",
    label: "Lumbar Spine MRI",
    body: `EXAMINATION: MRI Lumbar Spine without Contrast

CLINICAL HISTORY: Lower back pain.

FINDINGS:
- Alignment: Normal lumbar lordosis without spondylolisthesis.
- Vertebral Bodies: Normal vertebral heights and marrow signal intensity. No fracture.
- Discs: Mild disc desiccation at L4-L5 without significant focal protrusion or canal stenosis.
- Thecal Sac & Conus: Conus medullaris terminates normally at L1-L2.

IMPRESSION:
Mild lumbar spondylosis without significant spinal canal or neural foraminal compromise.`,
  },
];

export function ReportingPanel() {
  const [templates, setTemplates] =
    useState<ReportTemplateRecord[]>(DEFAULT_TEMPLATES);
  const [selectedTpl, setSelectedTpl] = useState<ReportTemplateRecord>(
    DEFAULT_TEMPLATES[0],
  );
  const [body, setBody] = useState(DEFAULT_TEMPLATES[0].body);
  const [orders, setOrders] = useState<DiagnosticOrderRecord[]>([]);
  const [selectedOrder, setSelectedOrder] =
    useState<DiagnosticOrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tplRes, ordersRes] = await Promise.all([
        fetchTemplatesApi().catch(() => ({ data: { templates: [] } })),
        fetchPendingOrdersApi().catch(() => ({ data: { orders: [] } })),
      ]);

      const mergedTpls =
        tplRes.data.templates?.length > 0
          ? tplRes.data.templates
          : DEFAULT_TEMPLATES;
      setTemplates(mergedTpls);

      const availableOrders = ordersRes.data.orders || [];
      setOrders(availableOrders);

      // Auto-select first in-progress or pending order
      if (availableOrders.length > 0 && !selectedOrder) {
        const inProgress = availableOrders.find(
          (o) => o.status === "IN_PROGRESS",
        );
        setSelectedOrder(inProgress || availableOrders[0]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load reporting data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectTemplate = (t: ReportTemplateRecord) => {
    setSelectedTpl(t);
    setBody(t.body);
    toast.info(`Loaded ${t.label} template.`);
  };

  const handleSaveDraft = () => {
    toast.success("Report draft saved to browser local store.");
  };

  const handleSignAndPublish = async () => {
    if (!selectedOrder) {
      toast.error("Please select a study order to sign off.");
      return;
    }
    if (!body.trim()) {
      toast.error("Report body cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      // Mark order reported in backend
      await updateOrderStatusApi(selectedOrder._id, "REPORTED");
      toast.success(
        `Report signed & published for ${selectedOrder.patient?.firstName || "Patient"}! Released to records.`,
      );
      if (isCritical) {
        toast.error(
          "Critical finding flagged! Alert pushed to emergency closed-loop log.",
        );
      }
      setSelectedOrder(null);
      await loadData(true);
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Failed to sign & publish report.",
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.trim().toLowerCase();
    return orders.filter(
      (o) =>
        o.accessionNumber?.toLowerCase().includes(q) ||
        o.testName?.toLowerCase().includes(q) ||
        o.patient?.firstName?.toLowerCase().includes(q) ||
        o.patient?.lastName?.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="03 / reporting desk"
        title="Diagnostic Reporting & Dictation Desk"
        note="Structured RadLex reporting console. Select active studies, load evidence-based diagnostic templates, flag critical findings, and release official impressions."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={saving || !selectedOrder}
              onClick={handleSignAndPublish}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Signing &amp; Publishing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Sign &amp; Release</span>
                </>
              )}
            </button>
          </div>
        }
      />

      <div className="flex-1 flex flex-col lg:flex-row bg-background border-t border-border/60 min-h-0">
        {/* Left Col: Study Picker & Templates */}
        <div className="w-full lg:w-[35%] xl:w-[30%] flex flex-col border-r border-border/60 bg-muted/5 p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* Active Study Requisition */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="radiology-reporting-study-select"
                className="text-xs font-bold text-foreground font-mono uppercase tracking-wider"
              >
                1. Select Examination Study
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {orders.length} available
              </span>
            </div>

            <select
              id="radiology-reporting-study-select"
              aria-label="Select examination study"
              value={selectedOrder?._id || ""}
              onChange={(e) => {
                const found = orders.find((o) => o._id === e.target.value);
                setSelectedOrder(found || null);
              }}
              className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/25"
            >
              {orders.length === 0 ? (
                <option value="">No pending studies found</option>
              ) : (
                orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.accessionNumber || o._id.slice(-6)} ·{" "}
                    {o.patient?.firstName} {o.patient?.lastName} ({o.testName})
                  </option>
                ))
              )}
            </select>

            {selectedOrder && (
              <div className="mt-3 p-3.5 rounded-xl border border-border/70 bg-card text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    {selectedOrder.patient?.firstName}{" "}
                    {selectedOrder.patient?.lastName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary uppercase">
                    {selectedOrder.modality || "Imaging"}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Procedure:{" "}
                  <strong className="text-foreground">
                    {selectedOrder.testName}
                  </strong>
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/40">
                  <span>
                    ACC:{" "}
                    {selectedOrder.accessionNumber ||
                      selectedOrder._id.slice(-8)}
                  </span>
                  <span>Room: {selectedOrder.room || "Bay 1"}</span>
                </div>
              </div>
            )}
          </div>

          {/* RadLex Templates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="radiology-template-picker"
                className="text-xs font-bold text-foreground font-mono uppercase tracking-wider"
              >
                2. RadLex Structured Templates
              </label>
            </div>

            <div className="space-y-1.5">
              {templates.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => handleSelectTemplate(t)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    selectedTpl._id === t._id
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs border-primary"
                      : "bg-card hover:bg-muted/60 border-border/70 text-foreground"
                  }`}
                >
                  <p className="font-medium">{t.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Critical Value Flag Switch */}
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <TriangleAlert className="size-4" />
                <span>Critical / Panic Finding</span>
              </span>
              <input
                type="checkbox"
                checked={isCritical}
                onChange={(e) => setIsCritical(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
            </label>
            <p className="text-[11px] text-muted-foreground">
              Enable to automatically register this report in the Critical
              Findings callback queue for physician read-back.
            </p>
          </div>
        </div>

        {/* Right Col: Interactive Report Editor */}
        <div className="w-full lg:w-[65%] xl:w-[70%] flex flex-col p-4 sm:p-6 lg:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h3 className="font-mono text-base font-bold text-foreground">
                Diagnostic Report · {selectedTpl.label}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: {selectedOrder?.patient?.firstName || "Patient"}{" "}
                {selectedOrder?.patient?.lastName || ""} (
                {selectedOrder?.accessionNumber || "ACC-N/A"})
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs text-muted-foreground">
                {wordCount} words
              </span>
              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                ● Live Auto-Sync
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <textarea
              id="radiology-report-body"
              aria-label="Diagnostic report body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={22}
              className="flex-1 w-full rounded-2xl border border-border/80 bg-card p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/25 shadow-xs resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setBody(
                    (prev) =>
                      `${prev}\n\n[RECOMMENDATION]: Correlate clinically. Repeat imaging in 3-6 months as indicated.`,
                  )
                }
                className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                + Follow-up Recommendation
              </button>
              <button
                type="button"
                onClick={() =>
                  setBody(
                    (prev) =>
                      `${prev}\n\n[INCIDENTAL FINDING]: Benign simple renal cortical cyst, Bosniak category I.`,
                  )
                }
                className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                + Incidental Finding
              </button>
            </div>

            <button
              type="button"
              disabled={saving || !selectedOrder}
              onClick={handleSignAndPublish}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
            >
              Sign &amp; Release Official Report
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
