/**
 * Voice AI Agent use cases — each maps to an Exotel voicebot dp-endpoint.
 * The endpoint URL is hidden from users; they just click "Talk now".
 */
export const USE_CASES = [
  {
    id: 'support',
    title: 'AI voice agent for support',
    subtitle: 'Resolves issues in a single call',
    description: 'Ask a question, troubleshoot a product, or check the status of a complaint. Get an answer without waiting on hold.',
    icon: 'support_agent',
    color: '#0074E8',
    gradient: 'linear-gradient(135deg, #0074E8, #00EAC3)',
    endpoint: 'https://voicebot.in.exotel.com/voicebot/api/v1/accounts/ameyo5m/bots/f6561260-dfda-4570-93a7-d90e394fb053/dp-endpoint',
    sampleRate: 16000,
    greeting: 'Hello! I\'m here to help resolve your issue. What can I assist you with?',
    industry: 'Cross-industry',
  },
  {
    id: 'appointment-scheduling',
    title: 'AI voice agent for appointment scheduling',
    subtitle: 'Books appointments by voice',
    description: 'Book a new slot, move an existing one, or confirm your appointment. The agent checks availability and updates the calendar.',
    icon: 'calendar_month',
    color: '#9B42F1',
    gradient: 'linear-gradient(135deg, #9B42F1, #0074E8)',
    endpoint: 'https://voicebot.in.exotel.com/voicebot/api/v1/accounts/ameyo5m/bots/7b061ab2-995d-4cf3-8183-f2cbfc1a8a01/dp-endpoint',
    sampleRate: 16000,
    greeting: 'Hi! I\'m here to help you schedule an appointment. When would you like to book?',
    industry: 'Healthcare and services',
  },
  {
    id: 'collections',
    title: 'AI voice agent for collections',
    subtitle: 'Handles payment conversations',
    description: 'Discuss payment options, negotiate a settlement, or ask about your EMI. The agent listens, explains, and resolves.',
    icon: 'payments',
    color: '#E749A4',
    gradient: 'linear-gradient(135deg, #F3B843, #E749A4)',
    endpoint: 'https://voicebot.in.exotel.com/voicebot/api/v1/accounts/ameyo5m/bots/75277f09-48ca-4964-b09a-c62e9bd84cb6/dp-endpoint',
    sampleRate: 16000,
    greeting: 'Hi, I\'m calling regarding your account. I\'m here to help you with your payment options.',
    industry: 'BFSI and fintech',
  },
];

export const BRAND = {
  name: 'Exotel',
  tagline: 'Experience AI voice agents',
  heroTitle: 'Talk to our AI voice agents',
  heroSubtitle: 'Experience the future of customer conversations. Click any agent below, speak naturally, and see how AI handles real business scenarios — live.',
  defaultSampleRate: 16000,
};
