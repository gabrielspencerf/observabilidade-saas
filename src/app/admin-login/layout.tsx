import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Acesso exclusivo para administradores da plataforma.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  alternates: {
    canonical: "/admin-login",
  },
};

export default function AdminLoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
