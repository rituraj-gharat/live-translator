import "./globals.css";

export const metadata = {
  title: "Live Translator",
  description: "Real-time speech translation app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}