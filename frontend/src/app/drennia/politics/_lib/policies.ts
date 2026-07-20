export const POLICY_CATEGORIES = {
  labor_laws: {
    name: 'Labor Laws & Worker Rights',
    options: [
      { id: 'at_will', label: 'At-Will Employment' },
      { id: 'regulated', label: 'Regulated Labor' },
      { id: 'strong_unions', label: 'Strong Unions' }
    ]
  },
  trade_policy: {
    name: 'Trade & Tariffs',
    options: [
      { id: 'free_trade', label: 'Free Trade' },
      { id: 'fair_trade', label: 'Fair Trade' },
      { id: 'protectionism', label: 'Protectionism' }
    ]
  },
  environment: {
    name: 'Environmental Regulations',
    options: [
      { id: 'laissez_faire', label: 'Laissez-Faire' },
      { id: 'standard', label: 'Standard Emissions' },
      { id: 'green_mandates', label: 'Strict Green Mandates' }
    ]
  },
  corporate_tax: {
    name: 'Corporate Taxation',
    options: [
      { id: 'tax_haven', label: 'Tax Haven (10%)' },
      { id: 'standard', label: 'Standard Corporate Tax (25%)' },
      { id: 'progressive', label: 'Progressive High Tax (45%)' }
    ]
  },
  infrastructure: {
    name: 'Infrastructure & Logistics',
    options: [
      { id: 'minimal', label: 'Minimal Maintenance' },
      { id: 'modern', label: 'Modernization Program' },
      { id: 'state_of_art', label: 'State-of-the-Art Networks' }
    ]
  }
} as const;
