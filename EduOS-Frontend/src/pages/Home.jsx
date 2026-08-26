import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  FileText,
  FolderOpen,
  BookOpen,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button, Card, CardContent } from '@components/ui/index.jsx';

const features = [
  {
    icon: FileText,
    title: 'Smart Notes',
    description: 'Create, organize, and search your study notes with powerful rich-text editing.',
  },
  {
    icon: FolderOpen,
    title: 'Resource Library',
    description: 'Upload PDFs, documents, images, and videos. Everything in one secure place.',
  },
  {
    icon: BookOpen,
    title: 'Knowledge Base',
    description: 'Build your personal wiki. Connect topics and unlock deeper understanding.',
  },
  {
    icon: Clock,
    title: 'Learning History',
    description: 'Track what you studied, when, and for how long. Visualize your progress.',
  },
];

const benefits = [
  'Designed for Classes 6 through 12',
  'Clean, distraction-free interface',
  'Lightning-fast search across everything',
  'Your data, always secure and private',
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200">
        <div className="container-page flex items-center h-16 justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
              <GraduationCap className="h-5 w-5 text-white" strokeWidth={2.25} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight leading-none">EduOS</span>
              <span className="text-[10px] font-medium text-neutral-500 tracking-wider uppercase leading-none mt-1">
                Learning Platform
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="#features"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors no-underline"
            >
              Features
            </Link>
            <Link
              to="#how"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors no-underline"
            >
              How it works
            </Link>
            <Link
              to="#pricing"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors no-underline"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="no-underline">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/login" className="no-underline">
              <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2} />}>
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="absolute inset-x-0 top-0 -z-10">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 h-[600px] w-[1100px] rounded-full bg-gradient-to-br from-brand-100 via-brand-50 to-transparent blur-3xl opacity-60" />
        </div>

        <div className="container-page text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 mb-6">
            <Sparkles className="h-4 w-4 text-brand-600" strokeWidth={2} />
            <span className="text-sm font-medium text-brand-700">Built for the modern student</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
            Your learning,{' '}
            <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-brand-700 bg-clip-text text-transparent">
              organized beautifully
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            The all-in-one workspace for students. Store notes, upload resources, build your
            knowledge base, and track your learning journey — with AI-powered features coming soon.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="no-underline w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                rightIcon={<ArrowRight className="h-5 w-5" strokeWidth={2} />}
              >
                Start learning free
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Watch demo
            </Button>
          </div>

          <p className="mt-5 text-xs text-neutral-500">
            No credit card required · Free for all classes · Forever
          </p>

          <div className="mt-20 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-200/40 via-transparent to-brand-200/40 rounded-3xl blur-2xl" />
            <Card className="relative overflow-hidden rounded-2xl border-neutral-200/80">
              <div className="h-10 bg-neutral-100/80 border-b border-neutral-200 flex items-center px-4 gap-2">
                <div className="h-3 w-3 rounded-full bg-danger-400" />
                <div className="h-3 w-3 rounded-full bg-warning-400" />
                <div className="h-3 w-3 rounded-full bg-success-500" />
                <div className="ml-4 flex items-center gap-1.5 text-xs text-neutral-500">
                  <div className="h-6 w-80 rounded-md bg-white border border-neutral-200 flex items-center px-2 gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-brand-100" />
                    <span className="h-2 w-24 rounded-sm bg-neutral-100" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 p-6 text-left">
                <div className="col-span-3 space-y-2">
                  <div className="h-6 w-24 rounded bg-brand-500/10 rounded" />
                  <div className="space-y-1 mt-6">
                    {[
                      { w: 28, a: true },
                      { w: 24, a: false },
                      { w: 32, a: false },
                      { w: 28, a: false },
                      { w: 20, a: false },
                    ].map((it, i) => (
                      <div
                        key={i}
                        className={`h-8 rounded-lg ${it.a ? 'bg-brand-50' : 'hover:bg-neutral-50'}`}
                        style={{ width: `${it.w * 4}px` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="col-span-9 space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="h-8 w-44 rounded bg-neutral-900 mb-2" />
                      <div className="h-4 w-64 rounded bg-neutral-200" />
                    </div>
                    <div className="h-10 w-32 rounded-lg bg-brand-600" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl border border-neutral-200 p-4 space-y-2">
                        <div className="h-8 w-8 rounded-lg bg-brand-50" />
                        <div className="h-5 w-24 rounded bg-neutral-200" />
                        <div className="h-8 w-16 rounded bg-neutral-100" />
                        <div className="h-3 w-full rounded bg-neutral-100" />
                        <div className="h-3 w-3/4 rounded bg-neutral-100" />
                      </div>
                    ))}
                  </div>
                  <div className="h-40 rounded-xl bg-neutral-50 border border-neutral-200" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-neutral-50/60 border-y border-neutral-200">
        <div className="container-page">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-3">
              Everything you need
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Designed for how students actually learn
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Four powerful modules that work together to make studying effortless and effective.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={i} className="p-8 group hover:bg-neutral-50/40">
                  <CardContent className="p-0">
                    <div className="flex items-start gap-5">
                      <div className="shrink-0 h-12 w-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                        <Icon className="h-6 w-6 text-brand-600" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                        <p className="text-neutral-600 leading-relaxed">{f.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how" className="py-24">
        <div className="container-page">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-3">
                Why EduOS
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                One place. All your learning.
              </h2>
              <p className="mt-4 text-lg text-neutral-600 leading-relaxed">
                Stop juggling five different apps for notes, PDFs, bookmarks, and flashcards. EduOS
                brings everything together into a single, beautiful workspace that grows with you.
              </p>

              <ul className="mt-10 space-y-4">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2
                      className="h-5 w-5 text-brand-600 shrink-0 mt-0.5"
                      strokeWidth={2.25}
                    />
                    <span className="text-neutral-700 font-medium">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <Link to="/login" className="no-underline">
                  <Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" strokeWidth={2} />}>
                    Create your workspace
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-brand-100 to-transparent rounded-3xl blur-2xl opacity-50" />
              <Card className="relative p-8">
                <div className="space-y-6">
                  {[
                    { t: '📚 Physics Notes', s: 'Last edited 2 hours ago', c: 'bg-brand-50' },
                    { t: '📄 History Worksheet.pdf', s: 'Uploaded yesterday', c: 'bg-warning-50' },
                    { t: '🧠 Trigonometry Cheatsheet', s: 'In Knowledge Base', c: 'bg-success-50' },
                    {
                      t: '⏱️ 3h 12m studied today',
                      s: 'Math · Chemistry · English',
                      c: 'bg-neutral-100',
                    },
                  ].map((it, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-4 p-4 rounded-xl ${it.c} transition-transform hover:scale-[1.01]`}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-900">{it.t}</p>
                        <p className="text-sm text-neutral-600">{it.s}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-neutral-400" strokeWidth={2} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container-page">
          <Card className="relative overflow-hidden p-12 sm:p-16 border-none bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white">
            <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-900/40 blur-3xl" />

            <div className="relative max-w-2xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Ready to supercharge your learning?
              </h2>
              <p className="mt-4 text-lg text-white/80 leading-relaxed">
                Join thousands of students who are already organizing their studies with EduOS. Free
                forever.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login" className="no-underline w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-brand-700 hover:bg-brand-50"
                    rightIcon={<ArrowRight className="h-5 w-5" strokeWidth={2} />}
                  >
                    Get started free
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  Learn more
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <footer className="border-t border-neutral-200 py-12 bg-white">
        <div className="container-page">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
                <GraduationCap className="h-5 w-5 text-white" strokeWidth={2.25} />
              </div>
              <div>
                <p className="text-base font-semibold">EduOS</p>
                <p className="text-sm text-neutral-500">Built for students, by students.</p>
              </div>
            </div>
            <p className="text-sm text-neutral-500">
              © 2026 EduOS Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
