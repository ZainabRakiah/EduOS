import React, { useState } from 'react';
import {
  HelpCircle,
  Mail,
  Phone,
  Info,
  Bug,
  Shield,
  FileCheck,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Clock,
  Send,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Separator,
} from '@components/ui/index.jsx';

const faqItems = [
  {
    q: 'How do I create a new note?',
    a: 'Go to the Notes page and click the "Create Note" button in the top right. Fill in the title, content, subject (optional), and tags (optional), then submit.',
  },
  {
    q: 'What file types can I upload to Resources?',
    a: 'You can upload PDFs, documents, images, videos, and audio files. Common formats like PDF, DOCX, PNG, JPG, MP4, and MP3 are supported. Maximum file size may apply based on your plan.',
  },
  {
    q: 'How do I track my learning progress?',
    a: 'Visit the Learning History page to see your recently viewed, edited, and uploaded items. The Dashboard also shows your weekly study activity and key stats.',
  },
  {
    q: 'Can I change my email address?',
    a: 'For security reasons, email changes require manual verification. Please contact support using the details below and we will help you update your account email.',
  },
  {
    q: 'Is my data backed up?',
    a: 'Yes, all data is securely stored and regularly backed up on our servers. You can export your notes and resources at any time from your account settings.',
  },
  {
    q: 'How do I delete my account?',
    a: 'To permanently delete your account and associated data, please send a deletion request to support@eduos.app from your registered email. We process requests within 48 hours.',
  },
];

function FAQItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="border-b border-neutral-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 py-4 text-left hover:bg-neutral-50/50 px-1 -mx-1 rounded-lg transition-colors"
      >
        <span className="text-sm font-semibold text-neutral-900 flex-1">{q}</span>
        <div className="shrink-0 p-1 rounded-md text-neutral-500">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {isOpen && (
        <div className="pb-4 pr-8">
          <p className="text-sm text-neutral-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, description, icon: Icon, iconColor, children }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconColor}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export default function HelpSupport() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFAQ = (i) => {
    setOpenIndex(openIndex === i ? -1 : i);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
        <p className="mt-1 text-neutral-500 text-sm">
          Find answers, get in touch, and learn about our policies.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">FAQ</p>
              <p className="text-xs text-neutral-500">Common answers</p>
            </div>
            <Badge variant="default">6 topics</Badge>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="h-10 w-10 rounded-lg bg-success-50 text-success-600 flex items-center justify-center">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Support</p>
              <p className="text-xs text-neutral-500">Contact us</p>
            </div>
            <Badge variant="success">24/7</Badge>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="h-10 w-10 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Report</p>
              <p className="text-xs text-neutral-500">Bugs & issues</p>
            </div>
            <Badge variant="warning">Quick</Badge>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="h-10 w-10 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Policies</p>
              <p className="text-xs text-neutral-500">Privacy & Terms</p>
            </div>
            <Badge variant="neutral">Legal</Badge>
          </CardContent>
        </Card>
      </div>

      <SectionCard
        title="Frequently Asked Questions"
        description="Quick answers to the most common questions"
        icon={HelpCircle}
        iconColor="bg-brand-50 text-brand-600"
      >
        <div>
          {faqItems.map((item, i) => (
            <FAQItem
              key={i}
              q={item.q}
              a={item.a}
              isOpen={openIndex === i}
              onToggle={() => toggleFAQ(i)}
            />
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SectionCard
          title="Contact Support"
          description="We're here to help"
          icon={Mail}
          iconColor="bg-success-50 text-success-600"
        >
          <div className="space-y-4">
            <a
              href="mailto:support@eduos.app"
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Email</p>
                <p className="text-xs text-neutral-500">support@eduos.app</p>
                <p className="text-xs text-brand-600 font-medium mt-0.5 inline-flex items-center gap-1">
                  Send message <ExternalLink className="h-3 w-3" />
                </p>
              </div>
            </a>
            <div className="flex items-start gap-3 p-3 rounded-lg">
              <div className="h-9 w-9 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center shrink-0">
                <Phone className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Phone</p>
                <p className="text-xs text-neutral-500">+1 (555) 123-4567</p>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-500">
                  <Clock className="h-3 w-3" />
                  <span>Mon–Fri, 9am–6pm local</span>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3 p-3 rounded-lg">
              <div className="h-9 w-9 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                <Info className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Information</p>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Average response time is under 24 hours on business days. For urgent account
                  issues, please include your registered email in the subject line.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Report a Bug"
          description="Found something wrong? Let us know"
          icon={Bug}
          iconColor="bg-warning-50 text-warning-600"
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 leading-relaxed">
              If you encounter a bug, glitch, or unexpected behavior, please report it to our
              engineering team. Include steps to reproduce, what you expected to happen, and
              screenshots if possible.
            </p>
            <a
              href="mailto:bugs@eduos.app?subject=Bug%20Report%20-%20EduOS&body=Please%20describe%20the%20bug%20you%20encountered%3A%0A%0A1.%20Steps%20to%20reproduce%3A%0A2.%20Expected%20behavior%3A%0A3.%20Actual%20behavior%3A%0A4.%20Browser%2FDevice%3A"
              className="inline-flex items-center justify-center w-full"
            >
              <Button variant="outline" className="w-full" leftIcon={<Send className="h-4 w-4" />}>
                Report via Email
              </Button>
            </a>
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-100">
              <p className="text-xs font-medium text-neutral-700 mb-1">
                Tips for a good bug report:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-neutral-600">
                <li>Describe the issue clearly</li>
                <li>Include steps to reproduce</li>
                <li>Note your browser/device</li>
                <li>Add a screenshot if possible</li>
              </ul>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SectionCard
          title="Privacy Policy"
          description="How we handle your data"
          icon={Shield}
          iconColor="bg-success-50 text-success-600"
        >
          <div className="space-y-3 text-sm text-neutral-600 leading-relaxed">
            <p>
              At EduOS, we take your privacy seriously. We collect only the information necessary to
              provide and improve our services, including your name, email, and study content you
              create.
            </p>
            <p>
              Your personal data is encrypted in transit and at rest. We never sell your data to
              third parties, and we share information only with service providers essential to
              running the platform (e.g., secure hosting, email delivery).
            </p>
            <p>
              You can export or delete your account data at any time by contacting support. We
              retain data only as long as required for service operation and legal compliance.
            </p>
            <Badge variant="neutral" className="inline-flex">
              Full policy coming soon
            </Badge>
          </div>
        </SectionCard>

        <SectionCard
          title="Terms of Service"
          description="Using EduOS responsibly"
          icon={FileCheck}
          iconColor="bg-brand-50 text-brand-600"
        >
          <div className="space-y-3 text-sm text-neutral-600 leading-relaxed">
            <p>
              By using EduOS, you agree to use the platform for lawful, educational purposes only.
              You are responsible for the content you upload and ensuring you hold the necessary
              rights to share it.
            </p>
            <p>
              Accounts may be suspended for misuse, including uploading harmful content, violating
              intellectual property rights, or attempting to compromise platform security.
            </p>
            <p>
              The platform is provided "as is" with reasonable uptime guarantees. We recommend you
              keep local backups of critical study materials.
            </p>
            <Badge variant="neutral" className="inline-flex">
              Full terms coming soon
            </Badge>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
