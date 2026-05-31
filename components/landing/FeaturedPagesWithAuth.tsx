'use client'

import { useAuth } from '@/lib/auth-context'
import FeaturedPages from './FeaturedPages'

export default function FeaturedPagesWithAuth() {
  const { isPro } = useAuth()
  return <FeaturedPages isProUser={isPro} />
}
