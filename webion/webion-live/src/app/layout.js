import "./globals.css";
import Cursor from "@/components/Cursor";

export const metadata = {
  title: "Webion Live — Luxury Interactive Shopping",
  description: "Premium AR-powered real-time live shopping platform. Try before you buy.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      </head>
      <body className="antialiased ambient-bg">
        <Cursor />
        {children}
      </body>
    </html>
  );
}
