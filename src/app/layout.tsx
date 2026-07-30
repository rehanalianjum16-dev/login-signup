import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SecureAuth - Premium Authentication System',
  description: 'Production-grade security authentication with Next.js, Prisma, and PostgreSQL.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
