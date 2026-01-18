/**
 * Authentication Components
 *
 * Provides auth UI components using Clerk.
 * Gracefully handles cases where Clerk is not configured (consumer tier).
 */

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  OrganizationSwitcher,
} from '@clerk/clerk-react'
import { isAuthEnabled } from '../hooks/useAuth'

// Check if Clerk is configured
const CLERK_ENABLED = isAuthEnabled()

/**
 * Wrapper that only renders children when user is signed in.
 * In consumer tier (no Clerk), always renders children.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) {
    return <>{children}</>
  }

  return <SignedIn>{children}</SignedIn>
}

/**
 * Wrapper that only renders children when user is signed out.
 * In consumer tier (no Clerk), never renders children.
 */
export function RequireGuest({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) {
    return null
  }

  return <SignedOut>{children}</SignedOut>
}

/**
 * Sign in button with customization.
 * Returns null in consumer tier.
 */
export function AuthSignInButton({
  mode = 'modal',
  children,
}: {
  mode?: 'modal' | 'redirect'
  children?: React.ReactNode
}) {
  if (!CLERK_ENABLED) {
    return null
  }

  return (
    <SignInButton mode={mode}>
      {children ?? (
        <button className="px-4 py-2 bg-primary-dark text-primary rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
          Sign In
        </button>
      )}
    </SignInButton>
  )
}

/**
 * Sign up button with customization.
 * Returns null in consumer tier.
 */
export function AuthSignUpButton({
  mode = 'modal',
  children,
}: {
  mode?: 'modal' | 'redirect'
  children?: React.ReactNode
}) {
  if (!CLERK_ENABLED) {
    return null
  }

  return (
    <SignUpButton mode={mode}>
      {children ?? (
        <button className="px-4 py-2 border border-primary-dark text-primary-dark rounded-full text-sm font-medium hover:bg-primary-dark hover:text-primary transition-colors">
          Sign Up
        </button>
      )}
    </SignUpButton>
  )
}

/**
 * User avatar button with dropdown menu.
 * Shows placeholder in consumer tier.
 */
export function AuthUserButton() {
  if (!CLERK_ENABLED) {
    // Show placeholder avatar for local development
    return (
      <div className="w-8 h-8 rounded-full bg-primary-dark text-primary flex items-center justify-center text-sm font-medium">
        L
      </div>
    )
  }

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: 'w-8 h-8',
        },
      }}
    />
  )
}

/**
 * Organization switcher dropdown.
 * Returns null in consumer tier.
 */
export function AuthOrgSwitcher() {
  if (!CLERK_ENABLED) {
    return null
  }

  return (
    <OrganizationSwitcher
      appearance={{
        elements: {
          organizationSwitcherTrigger: 'px-3 py-2 rounded-lg hover:bg-gray-100',
        },
      }}
      hidePersonal={true}
      afterCreateOrganizationUrl="/dashboard"
      afterLeaveOrganizationUrl="/dashboard"
      afterSelectOrganizationUrl="/dashboard"
    />
  )
}

/**
 * Complete auth header section.
 * Shows sign in/up when signed out, user button when signed in.
 */
export function AuthHeader() {
  if (!CLERK_ENABLED) {
    // Consumer tier - show local user indicator
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Local Mode</span>
        <AuthUserButton />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <AuthSignInButton />
        <AuthSignUpButton />
      </SignedOut>
      <SignedIn>
        <AuthOrgSwitcher />
        <AuthUserButton />
      </SignedIn>
    </div>
  )
}

export default {
  RequireAuth,
  RequireGuest,
  AuthSignInButton,
  AuthSignUpButton,
  AuthUserButton,
  AuthOrgSwitcher,
  AuthHeader,
}
