/**
 * Admin Panel — private, password-protected via HTTP Basic Auth.
 * Access: https://api.mindclash.xyz/admin
 * Credentials: admin / ADMIN_PASSWORD (from .env)
 */

const express = require('express');
const router  = express.Router();
const { getAllAgentStats, db } = require('../db');

// User agents query — table may not exist on private backend
let getAllUserAgents;
try {
  getAllUserAgents = db.prepare('SELECT * FROM user_agents ORDER BY created_at DESC LIMIT 50');
} catch {
  getAllUserAgents = { all: () => [] };
}

// ── Basic Auth middleware ─────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const b64    = header.replace('Basic ', '');
  let user = '', pass = '';
  try {
    [user, pass] = Buffer.from(b64, 'base64').toString().split(':');
  } catch { /* ignore */ }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(503).send('Admin auth not configured');
  if (user === 'admin' && pass === expected) return next();

  res.set('WWW-Authenticate', 'Basic realm="MindClash Admin"');
  res.status(401).send('Unauthorized');
}

router.use(requireAuth);

// ── HTML dashboard ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const agentStats  = getAllAgentStats.all();
  const userAgents  = getAllUserAgents.all(50);
  const uptime      = Math.floor(process.uptime());
  const mem         = process.memoryUsage();
  const onChain     = process.env.ENABLE_ONCHAIN_SIGNING === 'true';
  const groqReady   = !!(process.env.GROQ_API_KEY && process.env.NEURAL_PROVIDER === 'groq');
  const apiUrl      = `${req.protocol}://${req.get('host')}`;

  const agentRows = agentStats.map(a => `
    <tr>
      <td>${a.name}</td>
      <td><span class="badge">${a.strategy}</span></td>
      <td>${a.total_decisions}</td>
      <td>${a.correct_decisions}</td>
      <td class="${a.win_rate >= 55 ? 'green' : a.win_rate >= 45 ? 'yellow' : 'red'}">${a.win_rate.toFixed(1)}%</td>
      <td class="${a.total_pnl >= 0 ? 'green' : 'red'}">${a.total_pnl >= 0 ? '+' : ''}${a.total_pnl.toFixed(0)}</td>
    </tr>`).join('');

  const userRows = userAgents.length
    ? userAgents.map(u => `
    <tr>
      <td>#${u.token_id}</td>
      <td>${u.name}</td>
      <td><span class="badge">${u.strategy}</span></td>
      <td class="mono small">${u.creator_address.slice(0,10)}…${u.creator_address.slice(-6)}</td>
      <td class="small">${new Date(u.created_at * 1000).toLocaleDateString()}</td>
    </tr>`).join('')
    : '<tr><td colspan="5" class="dim">No user agents yet</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MindClash Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#06060a;color:#e2e8f0;min-height:100vh;padding:24px}
  h1{font-size:1.4rem;font-weight:900;color:#fff;margin-bottom:4px}
  .sub{color:#64748b;font-size:.8rem;margin-bottom:24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px}
  .card{background:#0f0f17;border:1px solid #1e293b;border-radius:12px;padding:16px}
  .card .label{font-size:.7rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
  .card .value{font-size:1.3rem;font-weight:800}
  .green{color:#22c55e} .yellow{color:#eab308} .red{color:#ef4444} .blue{color:#3b82f6} .purple{color:#a855f7}
  .dim{color:#475569}
  section{background:#0f0f17;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:20px}
  section h2{font-size:.85rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:.82rem}
  th{text-align:left;color:#475569;font-weight:600;padding:6px 10px;border-bottom:1px solid #1e293b;font-size:.72rem;text-transform:uppercase}
  td{padding:8px 10px;border-bottom:1px solid #0d0d15}
  tr:hover td{background:#141420}
  .badge{background:#1e293b;color:#94a3b8;border-radius:4px;padding:2px 6px;font-size:.72rem;font-weight:600}
  .mono{font-family:monospace} .small{font-size:.75rem;color:#64748b}
  .actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}
  .btn{background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;padding:8px 14px;font-size:.8rem;font-weight:600;cursor:pointer;text-decoration:none;transition:all .15s}
  .btn:hover{background:#334155;color:#fff}
  .btn.primary{background:#3b82f620;color:#3b82f6;border-color:#3b82f640}
  .btn.primary:hover{background:#3b82f630}
  .btn.green-btn{background:#22c55e20;color:#22c55e;border-color:#22c55e40}
  .btn.danger{background:#ef444420;color:#ef4444;border-color:#ef444440}
  #log{background:#000;border-radius:8px;padding:12px;font-family:monospace;font-size:.75rem;color:#22c55e;min-height:80px;max-height:200px;overflow-y:auto;white-space:pre-wrap;margin-top:12px}
  .pill{display:inline-block;border-radius:20px;padding:2px 10px;font-size:.7rem;font-weight:700}
  .pill.on{background:#22c55e20;color:#22c55e;border:1px solid #22c55e40}
  .pill.off{background:#ef444420;color:#ef4444;border:1px solid #ef444440}
  .refresh-note{color:#475569;font-size:.7rem;margin-top:8px}
</style>
</head>
<body>
<h1>⚡ MindClash Admin</h1>
<div class="sub">Private backend control panel — ${new Date().toUTCString()}</div>

<div class="grid">
  <div class="card">
    <div class="label">Status</div>
    <div class="value green">● Online</div>
  </div>
  <div class="card">
    <div class="label">Uptime</div>
    <div class="value blue">${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m</div>
  </div>
  <div class="card">
    <div class="label">Memory (RSS)</div>
    <div class="value">${(mem.rss/1024/1024).toFixed(0)} MB</div>
  </div>
  <div class="card">
    <div class="label">On-Chain Signing</div>
    <div class="value">${onChain ? '<span class="pill on">ENABLED</span>' : '<span class="pill off">DISABLED</span>'}</div>
  </div>
  <div class="card">
    <div class="label">Groq LLM</div>
    <div class="value">${groqReady ? '<span class="pill on">ACTIVE</span>' : '<span class="pill off">RULES</span>'}</div>
  </div>
  <div class="card">
    <div class="label">Chain</div>
    <div class="value purple">Mantle Sepolia</div>
  </div>
</div>

<section>
  <h2>🤖 Trigger Bot Decision</h2>
  <div class="actions">
    ${[5,6,7].map(id => ['BTC','ETH','SOL','MNT'].map(asset => `
    <button class="btn primary" onclick="triggerBot(${id},'${asset}')">
      Bot #${id} ${asset}
    </button>`).join('')).join('')}
  </div>
  <div id="log">Ready. Click a button to trigger a bot decision on-chain...</div>
  <p class="refresh-note">Decisions are signed on-chain via AGENT_PRIVATE_KEY and recorded to AgentNFT contract.</p>
</section>

<section>
  <h2>📊 System Bot Stats (DB)</h2>
  <table>
    <thead><tr><th>Name</th><th>Strategy</th><th>Decisions</th><th>Correct</th><th>Win Rate</th><th>PnL</th></tr></thead>
    <tbody>${agentRows || '<tr><td colspan="6" class="dim">No stats yet</td></tr>'}</tbody>
  </table>
</section>

<section>
  <h2>👥 User-Created Agents</h2>
  <table>
    <thead><tr><th>Token</th><th>Name</th><th>Strategy</th><th>Creator</th><th>Created</th></tr></thead>
    <tbody>${userRows}</tbody>
  </table>
</section>

<section>
  <h2>🔗 Quick Links</h2>
  <div class="actions">
    <a class="btn" href="/health" target="_blank">Health Check</a>
    <a class="btn" href="/api/agents/stats" target="_blank">Agent Stats API</a>
    <a class="btn" href="/api/leaderboard" target="_blank">Leaderboard API</a>
    <a class="btn" href="/api/prices" target="_blank">Prices API</a>
    <a class="btn" href="/api/duels" target="_blank">Duels (GET all)</a>
    <a class="btn green-btn" href="https://www.mindclash.xyz" target="_blank">🌐 mindclash.xyz</a>
    <a class="btn" href="https://sepolia.mantlescan.xyz/address/${process.env.AGENT_NFT_ADDRESS}" target="_blank">AgentNFT on MantleScan</a>
    <a class="btn danger" onclick="if(confirm('Reload page?'))location.reload()">🔄 Refresh</a>
  </div>
</section>

<script>
async function triggerBot(tokenId, asset) {
  const log = document.getElementById('log');
  log.textContent = \`[\${new Date().toLocaleTimeString()}] Triggering Bot #\${tokenId} on \${asset}...\\n\`;
  try {
    const r = await fetch('${apiUrl}/api/agents/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId, asset })
    });
    const j = await r.json();
    if (j.success) {
      const d = j.decision;
      log.textContent += \`✅ Decision: \${d.direction} | Confidence: \${(d.confidence/10).toFixed(1)}% | Price: \$\${d.price?.toFixed(2)}\\n\`;
      log.textContent += \`📝 Reasoning: \${d.reasoning}\\n\`;
      if (j.txHash) {
        log.textContent += \`🔗 TxHash: \${j.txHash}\\n\`;
        log.textContent += \`🌐 \${j.explorerUrl}\\n\`;
      } else {
        log.textContent += \`⚠️  \${j.message || 'No txHash (check ENABLE_ONCHAIN_SIGNING)'}\\n\`;
      }
    } else {
      log.textContent += \`❌ Error: \${j.error}\\n\`;
    }
  } catch(e) {
    log.textContent += \`❌ Network error: \${e.message}\\n\`;
  }
}
</script>
</body>
</html>`;

  res.send(html);
});

module.exports = router;
