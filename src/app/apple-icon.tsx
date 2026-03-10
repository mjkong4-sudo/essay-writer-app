import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF8F5",
          borderRadius: 24,
          fontFamily: "serif",
          fontSize: 96,
          fontWeight: 700,
          color: "#B8860B",
        }}
      >
        T
      </div>
    ),
    { width: 180, height: 180 },
  );
}
