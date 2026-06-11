import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Graphly — Backend Engineering Knowledge Graph";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#faf9f6",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative background glow */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "600px",
            height: "630px",
            background: "radial-gradient(ellipse 60% 60% at 20% 50%, #FDDCDC, transparent)",
            opacity: 0.5,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "30px" }}>
            {/* Logo Mark SVG */}
            <svg viewBox="0 0 32 32" style={{ width: "80px", height: "80px" }}>
              <path d="M16 5L8 24" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.35" />
              <path d="M16 5L24 24" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.35" />
              <path d="M10 22L22 22" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.35" />
              <circle cx="16" cy="5" r="3.5" fill="#C0392B" />
              <circle cx="8" cy="24" r="3" fill="#FDDCDC" stroke="#C0392B" strokeWidth="1.5" />
              <circle cx="24" cy="24" r="3" fill="#FDDCDC" stroke="#C0392B" strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: "48px", fontWeight: "bold", color: "#2d2a26", letterSpacing: "-0.03em" }}>
              Graphly
            </span>
          </div>
          <h1 style={{ fontSize: "56px", fontWeight: "bold", color: "#2d2a26", lineHeight: 1.15, margin: 0, letterSpacing: "-0.03em" }}>
            Backend Engineering <br />
            <span style={{ color: "#C0392B" }}>Knowledge Graph</span>
          </h1>
          <p style={{ fontSize: "24px", color: "#7e7770", marginTop: "24px", maxWidth: "680px", lineHeight: 1.4 }}>
            Learn backend concepts, connections, and implementations across multiple languages.
          </p>
        </div>

        {/* Right side graphic - a nice graph cluster mockup */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "300px", height: "300px", zIndex: 10 }}>
          <svg viewBox="0 0 240 240" style={{ width: "280px", height: "280px" }}>
            {/* Connection lines */}
            <line x1="80" y1="60" x2="160" y2="100" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.2" />
            <line x1="160" y1="100" x2="120" y2="180" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.2" />
            <line x1="80" y1="60" x2="120" y2="180" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.2" />
            <line x1="160" y1="100" x2="200" y2="50" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.15" />
            <line x1="80" y1="60" x2="40" y2="140" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.15" />

            {/* Nodes */}
            <circle cx="80" cy="60" r="16" fill="#FDDCDC" stroke="#C0392B" strokeWidth="1.5" />
            <circle cx="80" cy="60" r="5" fill="#C0392B" />

            <circle cx="160" cy="100" r="20" fill="#FEF0F0" stroke="#C0392B" strokeWidth="1.5" />
            <circle cx="160" cy="100" r="6" fill="#C0392B" />

            <circle cx="120" cy="180" r="14" fill="#FDDCDC" stroke="#C0392B" strokeWidth="1.5" />
            <circle cx="120" cy="180" r="4.5" fill="#C0392B" />

            <circle cx="200" cy="50" r="10" fill="#FEF0F0" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.6" />
            <circle cx="40" cy="140" r="8" fill="#FEF0F0" stroke="#C0392B" strokeWidth="1.5" strokeOpacity="0.5" />
          </svg>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
