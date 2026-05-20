/**
 * Voice AI agents — each maps to an Exotel voicebot dp-endpoint.
 * The endpoint URL is hidden from users; they just click "Talk now".
 *
 * - `featured: true`  → rendered as the hero agent.
 * - `category: 'collections'` → rendered in the Collections section.
 */
export const USE_CASES = [
  {
    id: 'master',
    featured: true,
    title: 'One voice AI agent for everything',
    subtitle: 'All-in-one skills',
    description: 'Ask about a product, book a slot, check an order, or sort out a payment, all in one conversation. It understands what you need and gets it done. No menus, no transfers, no hold music.',
    icon: 'auto_awesome',
    color: '#9B42F1',
    gradient: 'linear-gradient(135deg, #9B42F1, #0074E8)',
    endpoint: 'https://voicebot.in.exotel.com/voicebot/api/v1/accounts/Exotel1m/bots/02c4e3c2-2166-4490-af90-1030474bc056/dp-endpoint',
    sampleRate: 16000,
    industry: 'All-in-one',
  },
  {
    id: 'collections-en',
    category: 'collections',
    title: 'Collections agent · English',
    subtitle: 'Recovers payments, keeps customers',
    description: 'Talk through your balance, negotiate a settlement, or set up an EMI. The agent explains your options clearly and helps you resolve it on the spot.',
    icon: 'payments',
    color: '#0074E8',
    gradient: 'linear-gradient(135deg, #0074E8, #00EAC3)',
    endpoint: 'https://voicebot.in.exotel.com/voicebot/api/v1/accounts/ameyo5m/bots/75277f09-48ca-4964-b09a-c62e9bd84cb6/dp-endpoint',
    sampleRate: 16000,
    industry: 'BFSI & fintech · English',
  },
  {
    id: 'collections-ph',
    category: 'collections',
    title: 'Collections agent · Philippines',
    subtitle: 'Built for the Philippines market',
    description: 'A collections agent tuned for local context and tone in the Philippines. It recovers overdue payments while keeping the conversation respectful and customers on side.',
    icon: 'public',
    color: '#E749A4',
    gradient: 'linear-gradient(135deg, #F3B843, #E749A4)',
    endpoint: 'https://voicebot.in.exotel.com/voicebot/api/v1/accounts/Exotel1m/bots/7190387b-27e8-41bc-bfd3-6a3c97fac09d/dp-endpoint',
    sampleRate: 16000,
    industry: 'BFSI & fintech · Philippines',
  },
];

export const BRAND = {
  name: 'Exotel',
  defaultSampleRate: 16000,
};
