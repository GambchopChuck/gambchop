'use client'

import { useState } from 'react'
import Link from 'next/link'

const ACCENT = '#39ff9a'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const SANS   = 'var(--font-oswald), "Oswald", sans-serif'

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    group: 'Getting Started',
    items: [
      {
        q: 'What is Gambchop?',
        a: 'Gambchop is a sports betting data visualization platform. We display the historical outcomes of betting markets — moneyline wins and losses, spread covers, over/unders, home and away splits — as color-coded charts so you can spot streaks, patterns, and trends at a glance. We show you what has happened. What you do with that information is entirely up to you.',
      },
      {
        q: 'Is Gambchop a picks service?',
        a: 'No. Gambchop never makes picks, predictions, or recommendations. We are a data visualization tool. The charts show historical outcomes — you interpret them yourself.',
      },
      {
        q: 'What sports does Gambchop cover?',
        a: 'MLB is live now with full chart data. NBA, NHL, WNBA, and NFL are coming in Phase 2. College sports and tennis are planned for Phase 3.',
      },
      {
        q: 'How do I read the charts?',
        a: 'Each row represents one bet type for a team. Each colored cell is one game outcome. Green = win or cover. Red = loss or miss. Purple = over. Baby blue = under. Yellow = push. Read left to right from oldest to newest to see how results have been trending.',
      },
    ],
  },
  {
    group: 'Membership & Pricing',
    items: [
      {
        q: 'What is the difference between free and Pro?',
        a: 'Free members see the 3 most recent outcomes per chart row. Pro members see complete charts for the current and prior season, plus access to Chopper AI, Compare, Favorites, Chart News, and public profiles.',
      },
      {
        q: 'How much does Pro cost?',
        a: 'Pro is $20 per month or $180 per year. The annual plan saves you 25% compared to monthly.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes — Pro comes with a 3-day free trial. No credit card required to create a free account.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. You can cancel your Pro subscription at any time from your account settings. You will retain Pro access until the end of your current billing period.',
      },
    ],
  },
  {
    group: 'Features',
    items: [
      {
        q: 'What is Chopper?',
        a: "Chopper is Gambchop's Pro-tier AI agent. It reads chart screenshots and answers literal questions about our database — things like which teams are on the longest current spread cover streaks, or what a team's home record looks like over the last 30 days. Chopper does not make predictions or picks.",
      },
      {
        q: 'What is the Compare feature?',
        a: 'Compare lets Pro members select any two teams and view their full charts side by side with stat summary cards and a time frame filter. You can share comparison links with other members.',
      },
      {
        q: 'What is Chart News?',
        a: "Chart News is a daily automated news feed generated directly from Gambchop's own outcome data. It surfaces streaks, records, reversals, and league leaders in article form — all factual, no predictions.",
      },
      {
        q: 'What is the Streak Board?',
        a: 'The Streak Board shows every team currently on an active streak of 5 or more consecutive same-result outcomes in any bet type across all leagues.',
      },
      {
        q: 'What are Favorites?',
        a: 'Pro members can save up to 16 team and bet type combinations as favorites. They display as individual chart rows for quick access.',
      },
      {
        q: 'What is the Top Matchup feature?',
        a: 'Every day Gambchop automatically selects the highest-profile matchup per league based on combined moneyline and spread win rates. It appears as a scrolling ticker on the homepage and as a full card on the Schedule page.',
      },
    ],
  },
  {
    group: 'Data & Accuracy',
    items: [
      {
        q: "Where does Gambchop's data come from?",
        a: 'Betting lines come from The Odds API. Game schedules and probable pitchers come from the MLB Stats API. Historical outcomes are ingested and stored in our own database.',
      },
      {
        q: 'How often is the data updated?',
        a: 'Game outcomes are ingested daily. Betting lines on the Schedule page are cached and refreshed every hour.',
      },
      {
        q: 'How far back does the chart data go?',
        a: 'Currently the charts show data from the start of the MLB data ingestion in mid-May 2026 forward. Full season historical data is on the roadmap.',
      },
      {
        q: 'Can AI be used to determine the outcome of an event?',
        a: 'Absolutely not. There is none and will never be a crystal ball that predicts the future of a sports event. AI can only be used to analyze sports data.',
      },
    ],
  },
  {
    group: 'Community',
    items: [
      {
        q: 'What is the Community Board?',
        a: "The Community Board is Gambchop's discussion forum where members can post strategy, observations, line movement notes, and analysis across all leagues.",
      },
      {
        q: 'Can I show my social media on my profile?',
        a: 'Yes — Pro members can add up to 4 social handles (Twitter/X, Instagram, TikTok, YouTube) and choose 2 to display as icons next to their username on Community Board comments.',
      },
    ],
  },
  {
    group: 'Responsible Gambling',
    items: [
      {
        q: 'Does Gambchop promote gambling?',
        a: 'No. Gambchop is a data visualization tool. We display historical outcomes only and never recommend bets, picks, or wagers of any kind. All betting decisions are entirely the user\'s own.',
      },
      {
        q: 'Where can I get help with problem gambling?',
        a: 'If you or someone you know is experiencing issues with gambling, please contact the National Problem Gambling Helpline at 1-800-GAMBLER (1-800-426-2537) or visit ncpgambling.org. Help is available 24/7.',
      },
    ],
  },
]

// ─── Accordion item ───────────────────────────────────────────────────────────

function AccordionItem({
  q, a, isOpen, onToggle,
}: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '18px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          fontFamily: SANS, textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 14, fontWeight: 700, color: isOpen ? ACCENT : TEXT,
          letterSpacing: '0.03em', lineHeight: 1.3,
          transition: 'color 0.2s',
        }}>
          {q}
        </span>
        <span style={{
          fontSize: 20, lineHeight: 1, color: ACCENT, flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: isOpen ? 'rotate(45deg)' : 'none',
          display: 'inline-block',
        }}>
          +
        </span>
      </button>

      {/* Grid-row accordion — animates height without needing a fixed max-height */}
      <div style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.28s ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <p style={{
            fontSize: 13, color: '#d4d4d8', lineHeight: 1.75,
            margin: '0 0 20px', letterSpacing: '0.01em',
            fontFamily: 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif',
            paddingRight: 32,
          }}>
            {a}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FaqPage() {
  const [openKey, setOpenKey] = useState<string | null>(null)

  function toggle(key: string) {
    setOpenKey(prev => (prev === key ? null : key))
  }

  return (
    <div style={{ minHeight: '100vh', paddingLeft: 80, fontFamily: SANS }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 32px 100px' }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{
            fontSize: 9, color: ACCENT, letterSpacing: '0.3em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 14,
          }}>
            Help Center
          </div>
          <h1 style={{
            fontSize: 42, fontWeight: 900, color: TEXT,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            margin: '0 0 16px',
          }}>
            Frequently Asked Questions
          </h1>
          <p style={{
            fontSize: 13, color: '#ffffff', lineHeight: 1.65,
            margin: 0, maxWidth: 560,
            fontFamily: 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif',
          }}>
            Everything you need to know about Gambchop — charts, membership, features, and data.
          </p>
        </div>

        {/* ── Sections ────────────────────────────────────────────────────── */}
        {SECTIONS.map(section => (
          <div key={section.group} style={{ marginBottom: 48 }}>
            <div style={{
              fontSize: 9, color: ACCENT, letterSpacing: '0.28em',
              textTransform: 'uppercase', fontWeight: 700,
              marginBottom: 4, paddingBottom: 10,
              borderBottom: `1px solid ${ACCENT}33`,
            }}>
              {section.group}
            </div>

            {section.items.map(({ q, a }) => {
              const key = `${section.group}::${q}`
              return (
                <AccordionItem
                  key={key}
                  q={q}
                  a={a}
                  isOpen={openKey === key}
                  onToggle={() => toggle(key)}
                />
              )
            })}
          </div>
        ))}

        {/* ── Contact line ────────────────────────────────────────────────── */}
        <div style={{
          borderTop: `1px solid ${BORDER}`, paddingTop: 32, marginTop: 16,
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 11, color: '#ffffff', margin: 0,
            fontFamily: 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif',
            letterSpacing: '0.02em',
          }}>
            Still have questions?{' '}
            <a
              href="mailto:support@gambchop.com"
              style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}
            >
              support@gambchop.com
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
