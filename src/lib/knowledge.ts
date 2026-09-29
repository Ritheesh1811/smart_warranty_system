export interface KnowledgeDoc {
  id: string;
  category: string;
  brand: string;
  title: string;
  content: string;
  keywords: string[];
}

export const knowledgeBase: KnowledgeDoc[] = [
  {
    id: 'kd-1',
    category: 'Washing Machine',
    brand: 'LG',
    title: 'LG Washing Machine Warranty Policy',
    content:
      'The LG washing machine comes with a 2-year comprehensive warranty from the date of purchase. The motor is covered for 10 years. The warranty covers manufacturing defects in the drum, motor, pump, control board, and inlet valve. It does NOT cover damage caused by improper installation, use of non-standard detergents, physical damage, or unauthorized repairs. To file a claim, the original invoice and warranty registration are required.',
    keywords: ['warranty', 'motor', 'pump', 'drum', 'coverage', 'policy', 'lg', 'washing'],
  },
  {
    id: 'kd-2',
    category: 'Washing Machine',
    brand: 'LG',
    title: 'LG Washing Machine — Drainage Issue Troubleshooting',
    content:
      'If the washing machine is not draining: 1) Check the drain filter for blockages — clean it if clogged. 2) Inspect the drain hose for kinks or obstructions. 3) Listen for the drain pump operating — if no sound, the pump may be faulty. 4) If the pump hums but does not drain, the pump impeller may be jammed or broken. A recurring drainage issue after filter cleaning often indicates a failing drain pump that requires replacement.',
    keywords: ['drainage', 'drain', 'not draining', 'filter', 'pump', 'hose', 'troubleshooting', 'washing'],
  },
  {
    id: 'kd-3',
    category: 'Air Conditioner',
    brand: 'Samsung',
    title: 'Samsung AC Warranty Policy',
    content:
      'The Samsung air conditioner includes a 1-year comprehensive warranty and a 5-year warranty on the compressor. Covered components: compressor, condenser coil, evaporator coil, fan motor, PCB. Not covered: physical damage, gas recharging due to improper maintenance, corrosion from harsh environments, and damage from voltage fluctuations. Claim requires original invoice and service records.',
    keywords: ['warranty', 'compressor', 'cooling', 'gas', 'coil', 'fan', 'pcb', 'samsung', 'ac', 'air conditioner'],
  },
  {
    id: 'kd-4',
    category: 'Air Conditioner',
    brand: 'Samsung',
    title: 'Samsung AC — Not Cooling Troubleshooting',
    content:
      'If the AC is not cooling properly: 1) Clean or replace the air filter — a clogged filter is the most common cause. 2) Check if the outdoor unit is obstructed. 3) Verify the thermostat setting and mode. 4) If cooling does not improve after filter cleaning, the issue may be low refrigerant gas or a faulty compressor. Recurring cooling issues after filter cleaning typically indicate a refrigerant leak or compressor degradation requiring professional service.',
    keywords: ['not cooling', 'cooling', 'filter', 'compressor', 'gas', 'refrigerant', 'troubleshooting', 'ac', 'samsung'],
  },
  {
    id: 'kd-5',
    category: 'Refrigerator',
    brand: 'Whirlpool',
    title: 'Whirlpool Refrigerator Warranty Policy',
    content:
      'The Whirlpool refrigerator carries a 1-year comprehensive warranty and a 10-year warranty on the compressor. Covered: compressor, thermostat, evaporator, condenser, door seals. Not covered: glass shelves, bulbs, cosmetic damage, and damage from power surges. Claim requires original invoice and warranty card.',
    keywords: ['warranty', 'compressor', 'cooling', 'refrigerator', 'whirlpool', 'thermostat'],
  },
  {
    id: 'kd-6',
    category: 'Refrigerator',
    brand: 'Whirlpool',
    title: 'Whirlpool Refrigerator — Cooling Issue Troubleshooting',
    content:
      'If the refrigerator is not cooling: 1) Check that the vents inside are not blocked. 2) Clean the condenser coils at the back. 3) Verify the thermostat is set correctly. 4) Check door seals for gaps. 5) If the problem persists, the compressor or thermostat may be faulty and require professional repair. A recurring cooling issue often indicates compressor wear.',
    keywords: ['cooling', 'not cooling', 'compressor', 'condenser', 'thermostat', 'refrigerator', 'troubleshooting'],
  },
  {
    id: 'kd-7',
    category: 'Microwave',
    brand: 'Panasonic',
    title: 'Panasonic Microwave Warranty Policy',
    content:
      'The Panasonic microwave oven includes a 1-year comprehensive warranty and a 3-year warranty on the magnetron. Covered: magnetron, control panel, door mechanism, turntable motor. Not covered: improper use, use of metal containers, and physical damage to the door. Claim requires original invoice.',
    keywords: ['warranty', 'magnetron', 'microwave', 'panasonic', 'control panel', 'door'],
  },
  {
    id: 'kd-8',
    category: 'General',
    brand: 'General',
    title: 'Standard Warranty Claim Documentation',
    content:
      'To file any warranty claim, you typically need: 1) Original purchase invoice/receipt. 2) Warranty registration confirmation. 3) Product serial number. 4) Description of the issue. 5) Any previous service records if repairs were attempted. Having prior service history strengthens the claim, especially for recurring issues.',
    keywords: ['claim', 'documents', 'invoice', 'warranty', 'service record', 'receipt'],
  },
];

export function retrieveKnowledge(query: string, product?: { category: string; brand: string }): KnowledgeDoc[] {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);

  const scored = knowledgeBase.map((doc) => {
    let score = 0;
    for (const kw of doc.keywords) {
      if (queryLower.includes(kw)) score += 2;
    }
    for (const w of words) {
      if (doc.keywords.some((kw) => kw.includes(w) && w.length > 3)) score += 1;
      if (doc.content.toLowerCase().includes(w) && w.length > 3) score += 0.5;
    }
    if (product) {
      if (doc.category === product.category) score += 3;
      if (doc.brand === product.brand) score += 3;
    }
    if (doc.category === 'General') score += 1;
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.doc);
}
