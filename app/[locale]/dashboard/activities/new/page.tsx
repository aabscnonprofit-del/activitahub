import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Zap, Sparkles, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Create Activity — the single entry choice. BOTH paths create the same canonical Project and share the same
// downstream lifecycle (Workspace → Schedule → Publish → Public Activity → Participants → Memories). The only
// difference is HOW you start: knowing exactly what you want, or asking for help designing it.
export default async function CreateActivityChoicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const options = [
    {
      href: `/${locale}/dashboard/activities/quick`,
      icon: Zap,
      title: 'Quick Activity',
      tagline: 'I already know what I’m creating.',
      desc: 'Enter the title, place, date and price, and publish. No planning questions.',
      cta: 'Start a Quick Activity',
      primary: true,
    },
    {
      href: `/${locale}/plan-an-event`,
      icon: Sparkles,
      title: 'Plan with AI',
      tagline: 'Help me create and plan it.',
      desc: 'Describe your idea and let the planner design the experience, itinerary and budget with you.',
      cta: 'Plan with AI',
      primary: false,
    },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">Create an activity</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Two ways to start — both create the same activity you can publish and manage.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {options.map(({ href, icon: Icon, title, tagline, desc, cta, primary }) => (
          <Link
            key={href}
            href={href}
            className={`group flex flex-col rounded-xl border p-5 transition-colors ${
              primary ? 'border-brand-300 bg-brand-50/50 hover:bg-brand-50' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${primary ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-sm font-semibold text-brand-700">{tagline}</p>
            <p className="mt-2 flex-1 text-sm text-slate-600">{desc}</p>
            <span className={`mt-4 inline-flex items-center gap-1.5 text-sm font-bold ${primary ? 'text-brand-700' : 'text-slate-700'}`}>
              {cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
