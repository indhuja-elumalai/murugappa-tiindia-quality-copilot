"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function TopbarAccount() {
  if (!clerkConfigured) return <span className="demo-mode">Demo mode</span>;
  return <ClerkTopbarAccount />;
}

function ClerkTopbarAccount() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <span className="account-loading" aria-label="Loading account" />;
  if (!isSignedIn) {
    return <div className="auth-buttons"><SignInButton><button className="secondary compact">Sign in</button></SignInButton><SignUpButton><button className="primary compact">Create account</button></SignUpButton></div>;
  }
  return <UserButton appearance={{ elements: { avatarBox: "clerk-avatar" } }} />;
}

export function SidebarIdentity() {
  if (!clerkConfigured) return <Identity initials="IE" name="Indhuja Elumalai" role="Portfolio demo" />;
  return <ClerkSidebarIdentity />;
}

function ClerkSidebarIdentity() {
  const { isLoaded, user } = useUser();
  if (!isLoaded || !user) return <Identity initials="…" name="Loading account" role="Secure session" />;
  const name = user.fullName || user.primaryEmailAddress?.emailAddress || "Quality engineer";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <Identity initials={initials} name={name} role="Quality engineering" />;
}

function Identity({ initials, name, role }: { initials: string; name: string; role: string }) {
  return <div className="user-mini"><div className="avatar">{initials}</div><div><b>{name}</b><span>{role}</span></div></div>;
}
