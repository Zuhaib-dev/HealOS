"use client";

import { Badge, Stage, Window, type Act } from "./stageshow-kit";
import { BedDouble } from "lucide-react";
import "./clinical-command-stage.css";

type Scene = { step: number };
const initial: Scene = { step: 0 };

const story = async (act: Act<Scene>) => {
  await act.wait(450);
  act.mark("queue");
  await act.set({ step: 1 });
  await act.wait(1100);
  act.mark("review");
  await act.set({ step: 2 });
  await act.wait(1000);
  act.mark("ready");
  await act.set({ step: 3 });
};

export function ClinicalCommandStage() {
  return (
    <Stage<Scene>
      width={690}
      height={390}
      compact={{ below: 540, width: 358, height: 410 }}
      initial={initial}
      poster={{ step: 3 }}
      play="once"
      script={story}
      accent="#26745c"
      className="clinical-stage"
    >
      {(scene, _rect, layout) => {
        const compact = layout === "compact";
        return (
          <Window
            title="Patient flow"
            className="clinical-window"
            sidebar={!compact ? <ClinicalSidebar /> : undefined}
            sidebarWidth={156}
            toolbar={
              <span className="clinical-window__date">TODAY · 09:42</span>
            }
          >
            <div className="clinical-screen">
              <div className="clinical-screen__heading">
                <div>
                  <p className="clinical-overline">Care coordination</p>
                  <h3>Transfer overview</h3>
                </div>
                <Badge tone="success" dot>
                  All systems ready
                </Badge>
              </div>

              <div className="clinical-summary">
                <div className="clinical-summary__copy">
                  <span className="clinical-overline">Next in queue</span>
                  <strong>Ward transfer</strong>
                  <span className="clinical-muted">
                    Meera Krishnan · HOS-88214
                  </span>
                </div>
                <Badge tone={scene.step >= 3 ? "success" : "warning"} dot>
                  {scene.step >= 3
                    ? "Ready to move"
                    : scene.step >= 2
                      ? "Bed confirmed"
                      : "Reviewing"}
                </Badge>
              </div>

              <div className="clinical-route" aria-label="Transfer workflow">
                {[
                  ["01", "Clinical review"],
                  ["02", "Bed assigned"],
                  ["03", "Transport ready"],
                ].map(([number, label], index) => (
                  <div
                    className="clinical-route__step"
                    data-done={scene.step > index || undefined}
                    key={number}
                  >
                    <span className="clinical-route__number">
                      {scene.step > index ? "✓" : number}
                    </span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div
                className="clinical-bed"
                data-ready={scene.step >= 3 || undefined}
              >
                <div className="clinical-bed__icon">
                  <BedDouble aria-hidden="true" />
                </div>
                <div className="clinical-bed__copy">
                  <strong>
                    {scene.step >= 2
                      ? "HDU · Bed 04"
                      : "Finding an available bed"}
                  </strong>
                  <span>
                    {scene.step >= 2
                      ? "South tower · monitored care"
                      : "Matching acuity and care requirements"}
                  </span>
                </div>
                <div className="clinical-bed__status">
                  {scene.step >= 3
                    ? "Confirmed"
                    : scene.step >= 2
                      ? "Reserved"
                      : "Matching"}
                </div>
              </div>

              <div className="clinical-foot">
                <span>
                  <i /> Secure care record · changes are audited
                </span>
                <span>Illustrative workflow</span>
              </div>
            </div>
          </Window>
        );
      }}
    </Stage>
  );
}

function ClinicalSidebar() {
  return (
    <nav
      className="clinical-sidebar"
      aria-label="Illustrative clinical navigation"
    >
      <span className="clinical-sidebar__brand">
        HEALOS <i>●</i>
      </span>
      <span className="clinical-sidebar__section">WORKSPACE</span>
      <span className="clinical-sidebar__item">Overview</span>
      <span className="clinical-sidebar__item clinical-sidebar__item--active">
        Patient flow
      </span>
      <span className="clinical-sidebar__item">Care teams</span>
      <span className="clinical-sidebar__section clinical-sidebar__section--lower">
        CLINICAL
      </span>
      <span className="clinical-sidebar__item">Patient records</span>
      <span className="clinical-sidebar__item">Diagnostics</span>
    </nav>
  );
}
