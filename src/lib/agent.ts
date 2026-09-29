import { supabase } from './supabase';
import type {
  Product,
  ProductInteraction,
  MemoryEvent,
  WarrantyStatus,
} from './types';
import { retrieveKnowledge } from './knowledge';

export function computeWarrantyStatus(expiry: string | null): WarrantyStatus {
  if (!expiry) return 'active';
  const now = new Date();
  const exp = new Date(expiry);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring';
  return 'active';
}

export function daysUntilExpiry(expiry: string | null): number | null {
  if (!expiry) return null;
  const now = new Date();
  const exp = new Date(expiry);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Detect issue category from free-text user message
const ISSUE_PATTERNS: { pattern: RegExp; issue: string; kind: 'problem' | 'troubleshooting' | 'repair' }[] = [
  { pattern: /not drain|drainage|drain/i, issue: 'drainage', kind: 'problem' },
  { pattern: /not cool|cooling|cool\s*issue|not cold/i, issue: 'cooling', kind: 'problem' },
  { pattern: /leak|leaking|water\s*on\s*floor/i, issue: 'leak', kind: 'problem' },
  { pattern: /noise|loud|vibrat|rattl/i, issue: 'noise', kind: 'problem' },
  { pattern: /not\s*start|won.t\s*start|power\s*on|no\s*power/i, issue: 'power', kind: 'problem' },
  { pattern: /spin|not\s*spinning/i, issue: 'spin', kind: 'problem' },
  { pattern: /ice|ice\s*maker|not\s*making\s*ice/i, issue: 'ice_maker', kind: 'problem' },
];

export function detectIssue(text: string): string | null {
  for (const { pattern, issue } of ISSUE_PATTERNS) {
    if (pattern.test(text)) return issue;
  }
  return null;
}

export function detectAction(text: string): 'troubleshooting' | 'repair' | 'service_visit' | 'conversation' | null {
  const t = text.toLowerCase();
  if (/replac|installed a new|swap.*part|new\s*pump|new\s*motor/i.test(t)) return 'repair';
  if (/service\s*visit|technician\s*visit|called.*technician|engineer\s*came/i.test(t)) return 'service_visit';
  if (/checked|cleaned|inspect|adjust|reset|tried|filter|hose|vent/i.test(t)) return 'troubleshooting';
  return null;
}

async function fetchInteractions(productId: string): Promise<ProductInteraction[]> {
  const { data, error } = await supabase
    .from('product_interactions')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchMemoryEvents(productId: string): Promise<MemoryEvent[]> {
  const { data, error } = await supabase
    .from('memory_events')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function recordInteraction(
  productId: string,
  kind: ProductInteraction['kind'],
  summary: string,
  detail: string | null,
  resolved: boolean,
): Promise<ProductInteraction> {
  const { data, error } = await supabase
    .from('product_interactions')
    .insert({ product_id: productId, kind, summary, detail, resolved })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function recordMemory(
  productId: string,
  layer: MemoryEvent['layer'],
  label: string,
  description: string,
): Promise<void> {
  await supabase.from('memory_events').insert({
    product_id: productId,
    layer,
    label,
    description,
  });
}

export interface IssuePattern {
  issue: string;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  repairs: string[];
  resolvedHistory: boolean[];
}

export async function detectPatterns(productId: string): Promise<IssuePattern[]> {
  const interactions = await fetchInteractions(productId);
  const issueMap = new Map<string, ProductInteraction[]>();

  for (const ix of interactions) {
    const issue = detectIssue(ix.summary + ' ' + (ix.detail ?? ''));
    if (issue) {
      const arr = issueMap.get(issue) ?? [];
      arr.push(ix);
      issueMap.set(issue, arr);
    }
  }

  const patterns: IssuePattern[] = [];
  for (const [issue, ixs] of issueMap) {
    if (ixs.length < 1) continue;
    const repairs = ixs
      .filter((i) => i.kind === 'repair' || i.kind === 'service_visit')
      .map((i) => i.summary);
    patterns.push({
      issue,
      count: ixs.length,
      firstOccurrence: ixs[0].created_at,
      lastOccurrence: ixs[ixs.length - 1].created_at,
      repairs,
      resolvedHistory: ixs.map((i) => i.resolved),
    });
  }
  return patterns.sort((a, b) => b.count - a.count);
}

export interface AgentResponse {
  reply: string;
  sources: string[];
  memoryUsed: boolean;
  patterns: IssuePattern[];
  newInteractions: ProductInteraction[];
  newMemories: MemoryEvent[];
}

function buildRecallContext(interactions: ProductInteraction[], patterns: IssuePattern[]): string {
  const parts: string[] = [];
  if (interactions.length > 0) {
    parts.push('Previous interaction history:');
    for (const ix of interactions.slice(-8)) {
      parts.push(
        `  - [${ix.kind}] ${ix.summary}${ix.resolved ? ' (resolved)' : ' (unresolved)'}`,
      );
    }
  }
  if (patterns.length > 0) {
    parts.push('Detected recurring patterns:');
    for (const p of patterns) {
      parts.push(
        `  - "${p.issue}" occurred ${p.count} time(s). Repairs attempted: ${p.repairs.length > 0 ? p.repairs.join('; ') : 'none'}.`,
      );
    }
  }
  return parts.join('\n');
}

function generateDiagnosis(
  product: Product,
  issue: string,
  patterns: IssuePattern[],
  interactions: ProductInteraction[],
  docs: { title: string; content: string }[],
): string {
  const matchingPattern = patterns.find((p) => p.issue === issue);
  const isFirstTime = !matchingPattern || matchingPattern.count <= 1;

  // Get relevant troubleshooting doc
  const tsDoc = docs.find((d) =>
    /troubleshoot|not\s*drain|not\s*cool|filter|pump|compressor/i.test(d.title),
  );

  const parts: string[] = [];

  if (isFirstTime) {
    parts.push(`I can see this is the first time you've reported a "${issue}" issue with your ${product.name}.`);
    if (tsDoc) {
      const steps = tsDoc.content.split(/\d\)/).filter((s) => s.trim().length > 5).slice(0, 4);
      parts.push(`Here's what I recommend based on the ${product.brand} service documentation:`);
      for (const step of steps) {
        parts.push(`  ${step.trim()}`);
      }
    }
  } else {
    const recurrence = matchingPattern!.count;
    const lastRepair = matchingPattern!.repairs.length > 0
      ? matchingPattern!.repairs[matchingPattern!.repairs.length - 1]
      : 'filter cleaning/troubleshooting';
    parts.push(
      `This is the ${ordinal(recurrence)} time you've reported a "${issue}" issue with this ${product.name}.`,
    );
    parts.push(
      `From my memory of your product's history: the previous intervention was "${lastRepair}", but the issue returned.`,
    );
    if (tsDoc) {
      const lines = tsDoc.content.split('. ');
      const recurringAdvice = lines.find((l) =>
        /recurr|persist|indicat|fail|replac|degrad|wear/i.test(l),
      );
      if (recurringAdvice) {
        parts.push(`Based on the service documentation: ${recurringAdvice.trim()}.`);
      }
    }
    parts.push(
      `Given the recurrence pattern, I'd recommend escalating to a professional service visit. Would you like me to prepare a warranty claim with your full repair history included?`,
    );
  }

  return parts.join('\n\n');
}

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]);
}

export async function chat(
  product: Product,
  userMessage: string,
): Promise<AgentResponse> {
  const interactions = await fetchInteractions(product.id);
  const patterns = await detectPatterns(product.id);
  const existingMemories = await fetchMemoryEvents(product.id);

  const docs = retrieveKnowledge(userMessage, { category: product.category, brand: product.brand });
  const issue = detectIssue(userMessage);
  const action = detectAction(userMessage);

  const newInteractions: ProductInteraction[] = [];
  const newMemories: MemoryEvent[] = [];
  const sources = docs.map((d) => d.title);

  // Determine what the user is communicating
  const isReportingProblem = issue !== null && action === null;
  const isReportingAction = action !== null;

  let reply = '';
  let memoryUsed = false;

  if (isReportingProblem && issue) {
    // Record the problem
    const ix = await recordInteraction(product.id, 'problem', userMessage, `Detected issue: ${issue}`, false);
    newInteractions.push(ix);
    await recordMemory(product.id, 'RETAIN', `Issue reported: ${issue}`, `User reported: "${userMessage}"`);
    newMemories.push({ id: 'temp', product_id: product.id, layer: 'RETAIN', label: `Issue reported: ${issue}`, description: `User reported: "${userMessage}"`, created_at: new Date().toISOString() });

    // Check if we should RECALL
    const matchingPattern = patterns.find((p) => p.issue === issue);
    if (matchingPattern && matchingPattern.count >= 1) {
      memoryUsed = true;
      const recallLabel = `Recalled ${matchingPattern.count} previous "${issue}" incident(s)`;
      await recordMemory(product.id, 'RECALL', recallLabel,
        `Retrieved ${matchingPattern.count} previous interactions about "${issue}" from product memory.`,
      );
      newMemories.push({ id: 'temp', product_id: product.id, layer: 'RECALL', label: recallLabel, description: `Retrieved ${matchingPattern.count} previous interactions.`, created_at: new Date().toISOString() });
    }

    // Re-detect patterns with new interaction included
    const updatedPatterns = await detectPatterns(product.id);
    const updatedMatching = updatedPatterns.find((p) => p.issue === issue);

    // Check for REFLECT — if issue is recurring
    if (updatedMatching && updatedMatching.count >= 2) {
      const reflectLabel = `Pattern: "${issue}" recurring (${updatedMatching.count}x)`;
      const reflectDesc =
        updatedMatching.repairs.length > 0
          ? `The "${issue}" issue has recurred ${updatedMatching.count} times despite previous repair: ${updatedMatching.repairs.join(', ')}. Previous intervention did not permanently resolve the problem.`
          : `The "${issue}" issue has recurred ${updatedMatching.count} times. Previous troubleshooting did not permanently resolve the problem.`;

      const existingReflect = existingMemories.find(
        (m) => m.layer === 'REFLECT' && m.label.includes(issue),
      );
      if (!existingReflect || updatedMatching.count > 2) {
        await recordMemory(product.id, 'REFLECT', reflectLabel, reflectDesc);
        newMemories.push({ id: 'temp', product_id: product.id, layer: 'REFLECT', label: reflectLabel, description: reflectDesc, created_at: new Date().toISOString() });
      }
    }

    reply = generateDiagnosis(product, issue, updatedPatterns, interactions, docs);
    if (matchingPattern) memoryUsed = true;
  } else if (isReportingAction && action) {
    // Record the action (troubleshooting / repair / service visit)
    const resolved = /fix|solved|resolved|working\s*now|good\s*now/i.test(userMessage);
    const ix = await recordInteraction(product.id, action, userMessage, `Action: ${action}`, resolved);
    newInteractions.push(ix);
    await recordMemory(product.id, 'RETAIN', `${action} recorded`, `"${userMessage}"`);
    newMemories.push({ id: 'temp', product_id: product.id, layer: 'RETAIN', label: `${action} recorded`, description: `"${userMessage}"`, created_at: new Date().toISOString() });

    reply = resolved
      ? `Great — I've recorded that the issue has been resolved. I'll remember this for your ${product.name}'s history. If the problem returns, I'll know what was tried before and can help you escalate faster.`
      : `I've recorded this ${action} step in your ${product.name}'s memory. I'll keep tracking whether this resolves the issue long-term. If the problem comes back, I'll flag it as a recurring pattern.`;
  } else if (/warranty.*(claim|file|submit)|claim.*warranty|prepare.*claim/i.test(userMessage)) {
    const claimSummary = await generateClaimSummary(product);
    reply = claimSummary;
    memoryUsed = true;
    sources.push('Product memory (interaction history)');
  } else if (/warranty.*(status|active|valid|cover)|still.*warranty|is.*covered/i.test(userMessage)) {
    const status = computeWarrantyStatus(product.warranty_expiry);
    const days = daysUntilExpiry(product.warranty_expiry);
    const expDate = product.warranty_expiry
      ? new Date(product.warranty_expiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'unknown';

    const warrantyDoc = docs.find((d) => /warranty\s*polic/i.test(d.title));
    parts: {
      const lines: string[] = [];
      lines.push(`Your ${product.name}'s warranty is currently **${status.toUpperCase()}**.`);
      if (days !== null) {
        if (days > 0) lines.push(`It expires on ${expDate} — that's ${days} days from now.`);
        else lines.push(`It expired on ${expDate}.`);
      }
      if (warrantyDoc) {
        lines.push(`\nAccording to ${product.brand}'s warranty policy: ${warrantyDoc.content.split('.')[0]}.`);
        sources.push(warrantyDoc.title);
      }
      if (interactions.length > 0) {
        const issues = interactions.filter((i) => i.kind === 'problem');
        if (issues.length > 0) {
          memoryUsed = true;
          lines.push(`\nFrom my memory, you've reported ${issues.length} issue(s) with this product so far.`);
        }
      }
      reply = lines.join('\n');
    }
  } else {
    // General question — use RAG + memory
    const recallContext = buildRecallContext(interactions, patterns);
    if (interactions.length > 0) memoryUsed = true;

    const docContent = docs.map((d) => `${d.title}:\n${d.content}`).join('\n\n');

    reply = synthesizeAnswer(userMessage, product, docContent, recallContext, interactions);
  }

  return { reply, sources, memoryUsed, patterns, newInteractions, newMemories };
}

function synthesizeAnswer(
  query: string,
  product: Product,
  docContent: string,
  recallContext: string,
  interactions: ProductInteraction[],
): string {
  const lines: string[] = [];

  if (docContent) {
    const relevantDoc = docContent.split('\n\n')[0];
    const titleEnd = relevantDoc.indexOf(':\n');
    const content = titleEnd >= 0 ? relevantDoc.slice(titleEnd + 2) : relevantDoc;
    lines.push(`Based on ${product.brand}'s documentation for your ${product.name}:`);
    lines.push(content.split('. ').slice(0, 4).join('. ') + '.');
  }

  if (recallContext) {
    lines.push("\nFrom your product's memory:");
    const recallLines = recallContext.split('\n').filter((l) => l.trim());
    lines.push(...recallLines.slice(0, 5));
  }

  if (lines.length === 0) {
    lines.push(`I don't have specific documentation for that question about your ${product.name}, but I'm tracking everything in its memory. Could you describe the issue in more detail?`);
  }

  return lines.join('\n');
}

export async function generateClaimSummary(product: Product): Promise<string> {
  const interactions = await fetchInteractions(product.id);
  const patterns = await detectPatterns(product.id);
  const status = computeWarrantyStatus(product.warranty_expiry);
  const expDate = product.warranty_expiry
    ? new Date(product.warranty_expiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';
  const purchaseDate = product.purchase_date
    ? new Date(product.purchase_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const topPattern = patterns[0];
  const issueRecurrence = topPattern?.count ?? 1;
  const previousRepairs = interactions
    .filter((i) => i.kind === 'repair' || i.kind === 'service_visit' || i.kind === 'troubleshooting')
    .map((i) => i.summary)
    .slice(-5);

  const issue = topPattern?.issue ?? 'Reported issue';
  const repairsText = previousRepairs.length > 0 ? previousRepairs.join('; ') : 'None recorded';
  const docs = 'Original Invoice + Warranty Registration + Service Record';

  const summary = `**Warranty Claim Summary**

Product: ${product.brand} ${product.name}
Model: ${product.model_number ?? 'N/A'}
Serial: ${product.serial_number ?? 'N/A'}
Purchase Date: ${purchaseDate}
Warranty Expiry: ${expDate}
Warranty Status: ${status.toUpperCase()}
Issue: ${issue}
Issue Recurrence: ${issueRecurrence} time(s)
Previous Repairs/Actions: ${repairsText}
Documents Required: ${docs}

${topPattern && topPattern.count >= 2
  ? `**Pattern Note:** This issue has recurred ${topPattern.count} times despite previous intervention(s). This strengthens the case for a replacement or escalated repair under warranty.`
  : `This claim is supported by your product's interaction history and warranty coverage.`}`;

  // Save the claim
  await supabase.from('warranty_claims').insert({
    product_id: product.id,
    issue,
    warranty_status: status,
    issue_recurrence: issueRecurrence,
    previous_repairs: repairsText,
    documents_required: docs,
    claim_summary: summary,
    status: 'draft',
  });

  // Record memory
  await recordMemory(product.id, 'REFLECT', 'Warranty claim prepared',
    `Claim generated for recurring "${issue}" issue with ${issueRecurrence} occurrence(s).`,
  );

  return summary;
}

export interface DashboardStats {
  totalProducts: number;
  activeWarranties: number;
  expiringWarranties: number;
  expiredWarranties: number;
  totalIssues: number;
  recurringIssues: number;
  openClaims: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: products } = await supabase.from('products').select('*');
  const { data: interactions } = await supabase.from('product_interactions').select('*').eq('kind', 'problem');
  const { data: claims } = await supabase.from('warranty_claims').select('*').eq('status', 'draft');

  const prods = products ?? [];
  let active = 0, expiring = 0, expired = 0;
  for (const p of prods) {
    const s = computeWarrantyStatus(p.warranty_expiry);
    if (s === 'active') active++;
    else if (s === 'expiring') expiring++;
    else expired++;
  }

  let recurring = 0;
  for (const p of prods) {
    const patterns = await detectPatterns(p.id);
    if (patterns.some((pat) => pat.count >= 2)) recurring++;
  }

  return {
    totalProducts: prods.length,
    activeWarranties: active,
    expiringWarranties: expiring,
    expiredWarranties: expired,
    totalIssues: interactions?.length ?? 0,
    recurringIssues: recurring,
    openClaims: claims?.length ?? 0,
  };
}
