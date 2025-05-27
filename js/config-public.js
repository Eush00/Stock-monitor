// =============================================
// PUBLIC CONFIG - Versione sicura per GitHub Pages
// =============================================

const CONFIG = {
  // Supabase - Solo chiavi pubbliche
  supabase: {
    url: 'https://dxsrlekdnsppvomlqikj.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4c3JsZWtkbnNwcHZvbWxxaWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjc3MTgsImV4cCI6MjA2MzY0MzcxOH0.Je9Hx2S7JKqoAbxdfdUWSZqleVOmZyfJ22LmiTSUviU',
  },

  // API Endpoints (stesso del config originale)
  apis: {
    corsProxy: 'https://api.allorigins.win/raw?url=',
    yahoo: {
      baseUrl: 'https://query1.finance.yahoo.com',
      chart: '/v8/finance/chart/',
      quoteSummary: '/v10/finance/quoteSummary/',
      quote: '/v7/finance/quote',
    },
  },

  // Rate Limits ridotti per sicurezza
  rateLimits: {
    yahoo: {
      maxCalls: 50, // Ridotto da 100
      windowMs: 3600000, // 1 ora
    },
  },

  // Simboli fissi - no controllo admin
  targetSymbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],

  // Configurazione sync
  sync: {
    enabled: true,
    intervalMs: 1800000, // 30 minuti (più frequente)
    targetYears: 5,
    maxDailyApiCalls: 1000, // Ridotto
    batchSize: 20, // Ridotto
    safeMode: true,
  },

  // Controllo remoto
  control: {
    tableName: 'public_sync_control',
    checkIntervalMs: 60000, // Controlla comandi ogni minuto
  },

  // Debug disabilitato
  debug: {
    enabled: false,
    logLevel: 'error',
  },
};

// Funzione di validazione semplificata
function validateConfig() {
  if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
    console.error('❌ Configurazione Supabase mancante');
    return false;
  }
  return true;
}

console.log('📄 Config pubblico caricato');
