import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lynceus Telemetry Dashboard',
  description: 'Real-time power infrastructure monitoring and SNMP diagnostics',
  icons: {
    icon: '/favicon.svg', // Points to your custom SVG favicon (or /favicon.ico if using an .ico file)
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}