// =============================================
// PUBLIC CONFIG - Versione corretta
// =============================================

const CONFIG = {
  // ✅ RIPRISTINATO - Necessario per supabase-client.js esistente
  supabase: {
    url: 'https://dxsrlekdnsppvomlqikj.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4c3JsZWtkbnNwcHZvbWxxaWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjc3MTgsImV4cCI6MjA2MzY0MzcxOH0.Je9Hx2S7JKqoAbxdfdUWSZqleVOmZyfJ22LmiTSUviU',
  },

  // API Endpoints con CORS proxy migliorato
  apis: {
    // Proxy CORS più affidabili (in ordine di preferenza)
    corsProxies: [
      'https://corsproxy.io/?',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://api.allorigins.win/raw?url=',
      '', // Tentativo diretto (potrebbe fallire)
    ],
    yahoo: {
      baseUrl: 'https://query1.finance.yahoo.com',
      chart: '/v8/finance/chart/',
      quoteSummary: '/v10/finance/quoteSummary/',
      quote: '/v7/finance/quote',
    },
  },

  // Rate Limits ridotti per versione pubblica
  rateLimits: {
    yahoo: {
      maxCalls: 30, // Molto ridotto per sicurezza
      windowMs: 3600000, // 1 ora
    },
  },

  // Simboli limitati per versione pubblica
  testSymbols: ['AAPL', 'MSFT', 'GOOGL'], // ✅ AGGIUNTO - Serve per yahoo-finance.js

  // Configurazione sync più conservativa
  sync: {
    enabled: true,
    intervalMs: 3600000, // 1 ora (più lento)
    targetYears: 2, // Solo 2 anni invece di 5
    maxDailyApiCalls: 500, // Molto ridotto
    batchSize: 10, // Molto ridotto
    safeMode: true,
  },

  // Controllo remoto
  control: {
    tableName: 'sync_control', // Usa tabella esistente
    checkIntervalMs: 120000, // Ogni 2 minuti
  },

  // Cache settings (copiato dal config originale)
  cache: {
    stockDataTtl: 300000, // 5 minuti
    fundamentalsTtl: 3600000, // 1 ora
    ratesTtl: 1800000, // 30 minuti
  },

  // UI settings (copiato dal config originale)
  ui: {
    maxResultsDisplay: 100,
    chartColors: {
      primary: '#0066cc',
      success: '#28a745',
      warning: '#ffc107',
      danger: '#dc3545',
      info: '#17a2b8',
    },
    animationDuration: 300,
  },

  // Debug disabilitato per produzione
  debug: {
    enabled: false,
    logLevel: 'error',
    logToConsole: false,
    logToSupabase: false,
  },
};

// Validazione (stessa del config originale)
function validateConfig() {
  const errors = [];

  console.log('🔍 Validazione configurazione pubblica...');

  if (!CONFIG.supabase.url || CONFIG.supabase.url.includes('{{')) {
    errors.push('❌ Supabase URL non configurato correttamente');
  }

  if (!CONFIG.supabase.anonKey || CONFIG.supabase.anonKey.includes('{{')) {
    errors.push('❌ Supabase ANON KEY non configurato correttamente');
  }

  if (CONFIG.supabase.url && !CONFIG.supabase.url.startsWith('https://')) {
    errors.push('❌ Supabase URL deve iniziare con https://');
  }

  if (errors.length > 0) {
    console.error('🚨 Errori di configurazione:', errors);
    return false;
  }

  console.log('✅ Configurazione pubblica validata con successo');
  return true;
}

// Esporta per compatibilità
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

console.log('📄 config-public.js caricato correttamente');
