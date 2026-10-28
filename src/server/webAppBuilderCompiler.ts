export interface WebAppBuilderPromptInput {
  workspace_id: string;
  title: string;
  description: string;
  templateType: 'fintech' | 'ecommerce' | 'saas' | 'agency' | 'custom';
  primaryColor: string;
  currency: 'NGN' | 'USD';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generates a complete, self-contained, interactive HTML5 + Tailwind CSS + JS application
 * wired directly to the workspace's AGBA BaaS Table API (`/api/baas/:workspaceId/customers`
 * and `/api/baas/:workspaceId/orders`) so forms and buttons work live in the browser.
 */
export function compileInteractiveWebAppHtml(input: WebAppBuilderPromptInput): string {
  const safeTitle = escapeHtml(input.title.trim() || 'Lagos Digital Venture');
  const safeDesc = escapeHtml(
    input.description.trim() ||
      'Modern digital platform with live customer onboarding, Paystack checkout calculator, and real-time AGBA database sync.'
  );
  const symbol = input.currency === 'NGN' ? '₦' : '$';
  const starterPrice = input.currency === 'NGN' ? '15,000' : '19';
  const proPrice = input.currency === 'NGN' ? '45,000' : '49';
  const accent = input.primaryColor || '#1D3557';
  const wsId = escapeHtml(input.workspace_id);

  const badgeLabel =
    input.templateType === 'fintech'
      ? 'FINTECH & PAYSTACK SETTLEMENT PORTAL'
      : input.templateType === 'ecommerce'
        ? 'DIGITAL STOREFRONT & ORDER SYSTEM'
        : input.templateType === 'agency'
          ? 'CLIENT ONBOARDING & AGENCY PORTAL'
          : 'FULL-STACK SAAS WEB APPLICATION';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #FAF6EE; color: #14120E; }
    h1, h2, h3, .font-serif-title { font-family: 'Fraunces', serif; }
    .brand-bg { background-color: ${accent}; }
    .brand-text { color: ${accent}; }
    .brand-border { border-color: ${accent}; }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <!-- Top Navbar -->
  <header class="sticky top-0 z-30 bg-[#FAF6EE]/95 backdrop-blur border-b border-[#E2D9C5]">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg brand-bg text-white flex items-center justify-center font-bold text-sm shadow-sm">
          ${safeTitle.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <span class="font-serif-title font-bold text-lg tracking-tight">${safeTitle}</span>
          <span class="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#EFE8D8] text-[#5C5446]">${badgeLabel}</span>
        </div>
      </div>
      <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-[#5C5446]">
        <a href="#features" class="hover:text-[#14120E] transition">Features</a>
        <a href="#calculator" class="hover:text-[#14120E] transition">Pricing &amp; Calculator</a>
        <a href="#lead-form" class="hover:text-[#14120E] transition">Live Database Form</a>
      </nav>
      <a href="#lead-form" class="px-4 py-2 rounded-lg brand-bg text-white text-xs font-semibold hover:opacity-90 transition shadow-sm">
        Get Started Now
      </a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="py-16 md:py-24 px-6 border-b border-[#E2D9C5]">
    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
      <div class="lg:col-span-7 space-y-6">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-[#E2D9C5] text-xs font-mono text-[#5C5446]">
          <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
          Connected to AGBA Backend Table API (${wsId})
        </div>
        <h1 class="text-4xl sm:text-5xl font-bold leading-[1.12] tracking-tight text-[#14120E]">
          ${safeTitle}
        </h1>
        <p class="text-base sm:text-lg text-[#5C5446] leading-relaxed max-w-2xl">
          ${safeDesc}
        </p>
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <a href="#lead-form" class="px-6 py-3.5 rounded-xl brand-bg text-white text-sm font-semibold shadow hover:opacity-95 transition">
            Create Customer Account
          </a>
          <a href="#calculator" class="px-5 py-3.5 rounded-xl bg-white border border-[#E2D9C5] text-sm font-semibold text-[#14120E] hover:bg-[#EFE8D8] transition">
            Estimate ${input.currency} Pricing
          </a>
        </div>
      </div>

      <!-- Interactive Live Metric & Quick Order Card -->
      <div class="lg:col-span-5 bg-white rounded-2xl border border-[#E2D9C5] p-6 shadow-sm space-y-5">
        <div class="flex items-center justify-between border-b border-[#E2D9C5] pb-4">
          <div>
            <div class="text-xs font-mono uppercase tracking-wider text-[#5C5446]">Live Workspace Database</div>
            <h3 class="text-lg font-bold mt-0.5">Instant Order &amp; Lead Capture</h3>
          </div>
          <span class="px-2.5 py-1 rounded text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">LIVE API</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3.5 rounded-xl bg-[#FAF6EE] border border-[#E2D9C5]">
            <div class="text-xs text-[#5C5446]">Starter Plan</div>
            <div class="text-xl font-bold font-mono mt-1">${symbol}${starterPrice}<span class="text-xs font-normal">/mo</span></div>
          </div>
          <div class="p-3.5 rounded-xl bg-[#FAF6EE] border border-[#E2D9C5]">
            <div class="text-xs text-[#5C5446]">Growth Plan</div>
            <div class="text-xl font-bold font-mono mt-1">${symbol}${proPrice}<span class="text-xs font-normal">/mo</span></div>
          </div>
        </div>
        <div class="text-xs text-[#5C5446] leading-relaxed">
          Every signup submitted below writes directly to your AGBA <code>customers</code> database table in workspace <code>${wsId}</code>.
        </div>
      </div>
    </div>
  </section>

  <!-- Feature Grid -->
  <section id="features" class="py-16 px-6 border-b border-[#E2D9C5] bg-white">
    <div class="max-w-6xl mx-auto">
      <div class="max-w-2xl mb-10">
        <div class="text-xs font-mono uppercase tracking-wider brand-text font-semibold">Core Capabilities</div>
        <h2 class="text-2xl sm:text-3xl font-bold mt-1">Built for speed, transparency, and instant backend sync</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-[#FAF6EE] border border-[#E2D9C5]">
          <div class="w-9 h-9 rounded-lg brand-bg text-white flex items-center justify-center font-mono text-xs font-bold mb-4">01</div>
          <h3 class="text-lg font-bold mb-2">Supabase-Style Backend</h3>
          <p class="text-sm text-[#5C5446] leading-relaxed">Submissions from this website automatically save into your workspace's <code>customers</code> table via REST API.</p>
        </div>
        <div class="p-6 rounded-2xl bg-[#FAF6EE] border border-[#E2D9C5]">
          <div class="w-9 h-9 rounded-lg brand-bg text-white flex items-center justify-center font-mono text-xs font-bold mb-4">02</div>
          <h3 class="text-lg font-bold mb-2">${input.currency} Pricing &amp; Settlement</h3>
          <p class="text-sm text-[#5C5446] leading-relaxed">Transparent unit economics calculator with automatic fee estimation in ${input.currency} (${symbol}).</p>
        </div>
        <div class="p-6 rounded-2xl bg-[#FAF6EE] border border-[#E2D9C5]">
          <div class="w-9 h-9 rounded-lg brand-bg text-white flex items-center justify-center font-mono text-xs font-bold mb-4">03</div>
          <h3 class="text-lg font-bold mb-2">Automated Email Alerts</h3>
          <p class="text-sm text-[#5C5446] leading-relaxed">Trigger instant welcome emails and team notifications whenever a new customer signs up.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Interactive Pricing Calculator & Live Database Lead Form -->
  <section id="calculator" class="py-16 px-6 flex-1">
    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Interactive Estimator -->
      <div class="lg:col-span-6 bg-white rounded-2xl border border-[#E2D9C5] p-6 sm:p-8 shadow-sm">
        <div class="text-xs font-mono uppercase tracking-wider text-[#5C5446]">Interactive Estimator</div>
        <h3 class="text-2xl font-bold mt-1 mb-5">Calculate Your Monthly Plan</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-[#5C5446] mb-1.5">
              Number of Team Seats / Units: <span id="seatVal" class="font-mono font-bold text-[#14120E]">5</span>
            </label>
            <input id="seatRange" type="range" min="1" max="50" value="5" class="w-full accent-[#1D3557]" oninput="updateEstimate()" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-[#5C5446] mb-1.5">Select Tier</label>
            <select id="tierSelect" onchange="updateEstimate()" class="w-full rounded-xl border border-[#E2D9C5] bg-[#FAF6EE] px-3.5 py-2.5 text-sm">
              <option value="${input.currency === 'NGN' ? 15000 : 19}">Starter Plan (${symbol}${starterPrice} / unit)</option>
              <option value="${input.currency === 'NGN' ? 45000 : 49}">Growth Plan (${symbol}${proPrice} / unit)</option>
            </select>
          </div>
          <div class="p-4 rounded-xl bg-[#FAF6EE] border border-[#E2D9C5] flex items-center justify-between mt-4">
            <span class="text-sm font-medium text-[#5C5446]">Estimated Monthly Total</span>
            <span id="totalDisplay" class="text-2xl font-bold font-mono brand-text">${symbol}${input.currency === 'NGN' ? '75,000' : '95'}</span>
          </div>
        </div>
      </div>

      <!-- Live Database Signup Form -->
      <div id="lead-form" class="lg:col-span-6 bg-white rounded-2xl border border-[#E2D9C5] p-6 sm:p-8 shadow-sm">
        <div class="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold">Connected to AGBA Database</div>
        <h3 class="text-2xl font-bold mt-1 mb-2">Register &amp; Save to Workspace Table</h3>
        <p class="text-xs text-[#5C5446] mb-5">Submitting this form sends a live <code>POST /api/baas/${wsId}/customers</code> request.</p>
        <form id="agbaLeadForm" onsubmit="submitToAgbaTable(event)" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold text-[#5C5446] mb-1">Full Name</label>
            <input id="fullName" required placeholder="e.g. Chinedu Eze" class="w-full rounded-xl border border-[#E2D9C5] bg-[#FAF6EE] px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#5C5446] mb-1">Email Address</label>
            <input id="emailAddr" type="email" required placeholder="you@company.com" class="w-full rounded-xl border border-[#E2D9C5] bg-[#FAF6EE] px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#5C5446] mb-1">Selected Plan</label>
            <select id="planChoice" class="w-full rounded-xl border border-[#E2D9C5] bg-[#FAF6EE] px-3.5 py-2.5 text-sm">
              <option value="Builder">Builder (${symbol}${starterPrice})</option>
              <option value="Team & Agency">Team &amp; Agency (${symbol}${proPrice})</option>
            </select>
          </div>
          <button type="submit" id="submitBtn" class="w-full py-3 rounded-xl brand-bg text-white text-sm font-semibold hover:opacity-95 transition">
            Submit to Live Database Table
          </button>
          <div id="formStatus" class="hidden p-3 rounded-xl text-xs font-medium"></div>
        </form>
      </div>
    </div>
  </section>

  <footer class="py-8 px-6 border-t border-[#E2D9C5] text-center text-xs text-[#5C5446]">
    Built &amp; Hosted with AGBA Website &amp; App Studio · Workspace <code>${wsId}</code>
  </footer>

  <script>
    const currencySymbol = ${JSON.stringify(symbol)};
    const workspaceId = ${JSON.stringify(input.workspace_id)};

    function updateEstimate() {
      const seats = Number(document.getElementById('seatRange').value || 1);
      const unitPrice = Number(document.getElementById('tierSelect').value || 15000);
      document.getElementById('seatVal').textContent = String(seats);
      const total = seats * unitPrice;
      document.getElementById('totalDisplay').textContent = currencySymbol + total.toLocaleString();
    }

    async function submitToAgbaTable(e) {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const statusBox = document.getElementById('formStatus');
      const full_name = document.getElementById('fullName').value.trim();
      const email = document.getElementById('emailAddr').value.trim();
      const plan_tier = document.getElementById('planChoice').value;

      btn.disabled = true;
      btn.textContent = 'Saving to AGBA Table...';
      statusBox.className = 'hidden';

      try {
        const res = await fetch('/api/baas/' + encodeURIComponent(workspaceId) + '/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name,
            email,
            plan_tier,
            mrr_ngn: plan_tier.includes('Team') ? 45000 : 15000,
            verified: true
          })
        });
        const data = await res.json();
        statusBox.className = 'block p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-300';
        statusBox.textContent = 'Saved row ' + (data.insertedRow?.id || '') + ' into your workspace customers table!';
        document.getElementById('agbaLeadForm').reset();
      } catch (err) {
        statusBox.className = 'block p-3 rounded-xl text-xs font-medium bg-amber-50 text-amber-900 border border-amber-300';
        statusBox.textContent = 'Form captured locally in preview mode.';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit to Live Database Table';
      }
    }
  </script>
</body>
</html>`;
}
