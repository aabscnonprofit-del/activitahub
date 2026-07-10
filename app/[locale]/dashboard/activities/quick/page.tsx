import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { QuickActivityForm } from '@/components/activities/QuickActivityForm'

// Quick Activity — the direct create path for an organizer who already knows what they're creating. Produces
// the SAME canonical Project as the assisted path (no AI/OPE). Lives under /dashboard (middleware already gates
// it to a subscribed organizer).
export default async function QuickActivityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/${locale}/dashboard/activities/new`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-extrabold text-slate-900">Quick Activity</h1>
      <p className="mb-6 mt-1 max-w-xl text-sm text-slate-600">
        You already know what you&rsquo;re creating — just fill in the details and set the date. This creates a
        real activity you can publish; no planning questions.
      </p>
      <QuickActivityForm locale={locale} />
    </div>
  )
}
