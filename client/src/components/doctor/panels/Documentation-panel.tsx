"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, TriangleAlert, PenLine, Send, X, CheckCircle2 } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { toast } from "sonner";
import { getClinicalNotesApi, createClinicalNoteApi, getAssignedPatientsApi } from "@/lib/api/doctor";

const noteTemplates = [
  "Progress Note (SOAP)",
  "Admission Note",
  "Discharge Summary",
  "Operative Note",
  "Consult Note",
];

export function NotesPanel() {
  const [template, setTemplate] = useState(noteTemplates[0]!);
  const [body, setBody] = useState(
    "SUBJECTIVE\n\nOBJECTIVE\n  Obs: \n  Exam: \n\nASSESSMENT\n\nPLAN\n  1. ",
  );
  const [notes, setNotes] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notesRes, patientsRes] = await Promise.all([
        getClinicalNotesApi(),
        getAssignedPatientsApi()
      ]);
      setNotes(notesRes.data?.notes || []);
      setPatients(patientsRes.data?.patients || []);
    } catch (error) {
      toast.error("Failed to load clinical notes or patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveNote = async () => {
    if (!selectedPatientId) {
      toast.error("Please select a patient first.");
      return;
    }
    if (!body.trim()) {
      toast.error("Note content cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      const res = await createClinicalNoteApi({
        patientId: selectedPatientId,
        category: template,
        content: body,
      });
      if (res.status === "success") {
        toast.success("Note signed and filed successfully!");
        setBody("SUBJECTIVE\n\nOBJECTIVE\n  Obs: \n  Exam: \n\nASSESSMENT\n\nPLAN\n  1. ");
        loadData();
      }
    } catch (error) {
      toast.error("Failed to save clinical note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PanelHeader
        index="06 / documentation"
        title="Clinical notes"
        note="Structured note capture with templates, so what you write once lands in the record, the ledger and the discharge letter."
        actions={
          <ActionButton
            tone="solid"
            onClick={handleSaveNote}
            disabled={saving || !selectedPatientId}
          >
            {saving ? "Signing..." : "Sign note"}
          </ActionButton>
        }
      />
      <div className="grid lg:grid-cols-[220px_1fr]">
        <div className="hairline-b border-r border-(--hairline) p-4">
          <p className="mono-label text-muted-foreground">Templates</p>
          <div className="mt-3 flex flex-col gap-1">
            {noteTemplates.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTemplate(t)}
                className={`mono-label px-3 py-2 text-left ${
                  template === t
                    ? "bg-accent/12 text-brass"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <p className="mono-label text-muted-foreground">
              {template}
            </p>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-background border border-(--hairline) px-3 py-1.5 text-sm mono-label outline-none focus:border-accent"
            >
              <option value="">-- Select Patient --</option>
              {patients.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            className="hairline mt-3 min-h-72 w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none focus:ring-1 focus:ring-accent"
          />
          <p className="mono-label text-muted-foreground mt-3">
            {body.length} chars
          </p>
          
          <div className="mt-8">
            <h3 className="mono-label font-bold mb-4 border-b border-(--hairline) pb-2">Past Notes</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes found.</p>
            ) : (
              <div className="space-y-4">
                {notes.map((n, i) => (
                  <div key={i} className="p-4 border border-(--hairline) rounded bg-foreground/[0.02]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="mono-label font-bold text-brass">{n.category}</span>
                      <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-mono whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs mt-3 text-muted-foreground">Patient: {n.patient?.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
