/**
 * Authentication Hook
 *
 * Provides authentication state and utilities using Clerk.
 * Gracefully handles cases where Clerk is not configured (consumer tier).
 */

import { useAuth as useClerkAuth, useUser, useOrganization, useOrganizationList } from '@clerk/clerk-react'
import { useMemo } from 'react'

// Check if Clerk is configured
const CLERK_ENABLED = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

export interface AuthState {
  isLoaded: boolean
  isSignedIn: boolean
  userId: string | null
  orgId: string | null
  orgSlug: string | null
  orgRole: string | null
  getToken: () => Promise<string | null>
}

export interface UserInfo {
  id: string
  email: string | null
  name: string | null
  imageUrl: string | null
}

export interface OrgInfo {
  id: string
  name: string
  slug: string
  role: string
  imageUrl: string | null
}

/**
 * Hook for authentication state.
 * Returns consistent shape whether Clerk is enabled or not.
 */
export function useAuth(): AuthState {
  // If Clerk is not configured, return mock auth state for local development
  if (!CLERK_ENABLED) {
    return {
      isLoaded: true,
      isSignedIn: true,
      userId: 'local-user',
      orgId: null,
      orgSlug: null,
      orgRole: null,
      getToken: async () => null,
    }
  }

  // Use Clerk hooks when configured
  const { isLoaded, isSignedIn, userId, orgId, orgSlug, orgRole, getToken } = useClerkAuth()

  return {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId: userId ?? null,
    orgId: orgId ?? null,
    orgSlug: orgSlug ?? null,
    orgRole: orgRole ?? null,
    getToken: async () => {
      try {
        return await getToken()
      } catch {
        return null
      }
    },
  }
}

/**
 * Hook for current user info.
 */
export function useCurrentUser(): UserInfo | null {
  if (!CLERK_ENABLED) {
    return {
      id: 'local-user',
      email: 'local@biagent.dev',
      name: 'Local Developer',
      imageUrl: null,
    }
  }

  const { user, isLoaded } = useUser()

  if (!isLoaded || !user) {
    return null
  }

  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    name: user.fullName ?? user.firstName ?? null,
    imageUrl: user.imageUrl,
  }
}

/**
 * Hook for current organization info.
 */
export function useCurrentOrg(): OrgInfo | null {
  if (!CLERK_ENABLED) {
    return null
  }

  const { organization, isLoaded, membership } = useOrganization()

  if (!isLoaded || !organization) {
    return null
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug ?? '',
    role: membership?.role ?? 'member',
    imageUrl: organization.imageUrl,
  }
}

/**
 * Hook for listing user's organizations.
 */
export function useUserOrgs(): OrgInfo[] {
  if (!CLERK_ENABLED) {
    return []
  }

  const { organizationList, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  if (!isLoaded || !organizationList) {
    return []
  }

  return organizationList.map((item) => ({
    id: item.organization.id,
    name: item.organization.name,
    slug: item.organization.slug ?? '',
    role: item.membership.role,
    imageUrl: item.organization.imageUrl,
  }))
}

/**
 * Check if Clerk authentication is enabled.
 */
export function isAuthEnabled(): boolean {
  return CLERK_ENABLED
}

export default useAuth
