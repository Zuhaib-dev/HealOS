import { ImageResponse } from "next/og";

export const alt =
  "HealOS hospital operations platform for patient care and clinical teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#f6f7f3",
        color: "#102a26",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -100,
          top: -150,
          width: 560,
          height: 560,
          borderRadius: 280,
          background: "#dceee7",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 85,
          top: 80,
          width: 300,
          height: 300,
          borderRadius: 150,
          border: "1px solid #b9d8ca",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          padding: "58px 68px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "#0f766e",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            H
          </div>
          <span style={{ fontSize: 25, fontWeight: 700 }}>HealOS</span>
          <span
            style={{
              marginLeft: 12,
              color: "#54726a",
              fontSize: 14,
              letterSpacing: 2,
            }}
          >
            HOSPITAL OPERATIONS
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              color: "#0f766e",
              fontSize: 16,
              letterSpacing: 3,
              fontWeight: 700,
            }}
          >
            CONNECTED CARE, CLEARER WORKFLOWS
          </div>
          <div
            style={{
              maxWidth: 860,
              fontFamily: "Georgia, serif",
              fontSize: 67,
              lineHeight: 1.07,
              letterSpacing: -2,
              fontWeight: 500,
            }}
          >
            One platform for hospital care and operations.
          </div>
          <div
            style={{
              color: "#526660",
              fontSize: 23,
              lineHeight: 1.5,
              maxWidth: 800,
            }}
          >
            Patient access, clinical workspaces, diagnostics, pharmacy, and
            emergency workflows.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {["PATIENT PORTAL", "CLINICAL TEAMS", "EMERGENCY CARE"].map(
            (label) => (
              <div
                key={label}
                style={{
                  border: "1px solid #c8d9d2",
                  borderRadius: 999,
                  padding: "10px 15px",
                  color: "#31564c",
                  background: "rgba(255,255,255,.58)",
                  fontSize: 12,
                  letterSpacing: 1,
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    </div>,
    size,
  );
}
