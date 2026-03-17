import { Link } from "wouter";
import { ArrowLeft, Shield, AlertTriangle, Scale, FileText, UserCheck, Lock, Bell, ScrollText } from "lucide-react";

const SECTIONS = [
  {
    id: "nature",
    icon: Shield,
    title: "Nature of the Platform",
    content: [
      "The Knight Market is an independent, student-run prediction market platform. It is not affiliated with, endorsed by, or sponsored by Menlo School or its administration. All references to Menlo School are made solely because the platform's user base consists of Menlo students.",
      "KnightCoin (KC) is a virtual, in-school prediction market currency with no real-world monetary value. It cannot be exchanged for real money, goods, or services outside of this platform.",
      "Users receive KC for free upon registration and may earn more through successful predictions. KC exists solely to make predictions engaging and to track forecasting accuracy.",
      "The optional MetaMask/Sepolia integration allows users who are interested in blockchain technology to experience crypto wallet interactions in a risk-free educational environment. Using MetaMask is entirely optional — all platform features work with standard KC balances.",
    ],
  },
  {
    id: "insider-trading",
    icon: AlertTriangle,
    title: "Insider Trading",
    content: [
      "Insider trading is strictly prohibited. This means you may not use non-public information to gain an unfair advantage in any market.",
      "Examples include but are not limited to: a student council member betting on the outcome of a vote before it is publicly announced, an athlete betting on their own game while knowing about an injury that hasn't been disclosed, or anyone with advance knowledge of school policy changes betting on related markets.",
      "Consequences for insider trading include forfeiture of all KC gained from the offending trades, temporary suspension from the platform, and in severe or repeated cases, permanent account termination.",
    ],
  },
  {
    id: "manipulation",
    icon: Scale,
    title: "Market Manipulation",
    content: [
      "Market manipulation in any form is prohibited. This includes wash trading (trading with yourself or coordinating trades between accounts to artificially move prices), spoofing (placing and quickly canceling large orders to mislead other traders), and any coordinated effort to artificially inflate or deflate market prices.",
      "The platform employs automated safeguards to detect unusual trading patterns. Suspicious activity is flagged for admin review.",
      "Penalties for market manipulation carry the same severity as insider trading: forfeiture, suspension, or termination depending on the offense.",
    ],
  },
  {
    id: "market-requests",
    icon: FileText,
    title: "Market Requests",
    content: [
      "Any user can submit a market request for admin review. Admins will evaluate each request for clarity, relevance, and appropriateness.",
      "Markets that are offensive, discriminatory, target specific individuals in a harmful way, or violate school community standards will be denied.",
      "Admins reserve the right to modify the wording of a market request for clarity before approving it. If a request is denied, the submitting user may revise and resubmit.",
    ],
  },
  {
    id: "account-conduct",
    icon: UserCheck,
    title: "Account Conduct",
    content: [
      "Each user is allowed one account. Creating multiple accounts to exploit sign-up bonuses, manipulate markets, or circumvent restrictions is a violation of platform rules.",
      "If duplicate accounts are discovered, all secondary accounts will be terminated and any KC gained through multi-account exploitation will be forfeited from the primary account.",
    ],
  },
  {
    id: "disputes",
    icon: ScrollText,
    title: "Dispute Resolution",
    content: [
      "If you believe a market was resolved incorrectly, you may raise a dispute with the admin team. Disputes should include a clear explanation of why you believe the resolution was wrong, along with any supporting evidence.",
      "Admin decisions on market resolution are final. While admins will review disputes in good faith, the platform is ultimately a school project and admins have the final say on all resolution outcomes.",
    ],
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Privacy",
    content: [
      "Your username and display name are visible to other users on leaderboards and in market activity. This is necessary for the social and competitive aspects of the platform.",
      "Your email address and wallet address (if connected) are kept private and are only visible to platform admins for account management purposes.",
      "The platform does not sell or share any user data with third parties.",
    ],
  },
  {
    id: "changes",
    icon: Bell,
    title: "Changes to Policies",
    content: [
      "These policies may be updated at any time as the platform evolves. Users will be notified of significant changes, but it is your responsibility to review the policies periodically.",
      "Continued use of the platform after policy changes constitutes acceptance of the updated terms.",
    ],
  },
];

export default function Policies() {
  return (
    <div className="px-4 md:px-8 py-6 max-w-[740px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-3">
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-policies-title">
              Policies & Compliance
            </h1>
            <p className="text-xs text-muted-foreground">
              Rules and guidelines for The Knight Market
            </p>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-foreground/80 leading-relaxed">
          The Knight Market is a student-run prediction market designed for fun and education.
          It is not affiliated with, endorsed by, or sponsored by Menlo School; however, we strive to embody the school's stated values by being committed to ethicality, fairness, and respect.
          These policies exist to keep the platform fair, respectful, and enjoyable for
          everyone. Please read them carefully.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="rounded-lg border border-border bg-card/50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Contents
        </h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <button
                onClick={() =>
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-sm text-primary/80 hover:text-primary transition-colors text-left"
                data-testid={`link-policy-${s.id}`}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <section
              key={section.id}
              id={section.id}
              className="rounded-lg border border-border bg-card/30 p-5 space-y-3 scroll-mt-20"
              data-testid={`section-policy-${section.id}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  {idx + 1}. {section.title}
                </h2>
              </div>
              <div className="space-y-2.5 pl-[38px]">
                {section.content.map((paragraph, pi) => (
                  <p
                    key={pi}
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="text-center pb-4">
        <p className="text-xs text-muted-foreground">
          Last updated: March 2026. Questions? Contact a Knight Market admin.
        </p>
      </div>
    </div>
  );
}
