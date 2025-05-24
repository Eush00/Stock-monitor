// =============================================
// STOCK MONITOR - CONFIGURATION
// =============================================

const CONFIG = {
  // Supabase Configuration
  supabase: {
    url: '{{SUPABASE_URL}}', // Sarà sostituito da GitHub Actions
    anonKey: '{{SUPABASE_ANON_KEY}}', // Sarà sostituito da GitHub Actions
  },

  // API Endpoints e Configurazioni
  apis: {
    // Proxy CORS per aggirare limitazioni browser
    corsProxy: 'https://api.allorigins.win/raw?url=',

    // Yahoo Finance endpoints
    yahoo: {
      baseUrl: 'https://query1.finance.yahoo.com',
      chart: '/v8/finance/chart/',
      quoteSummary: '/v10/finance/quoteSummary/',
      quote: '/v7/finance/quote',
    },

    // Alpha Vantage (opzionale)
    alphaVantage: {
      baseUrl: 'https://www.alphavantage.co/query',
      apiKey: 'demo', // Sostituire con chiave reale
    },
  },

  // Rate Limiting
  rateLimits: {
    yahoo: {
      maxCalls: 100,
      windowMs: 3600000, // 1 ora
    },
    alphaVantage: {
      maxCalls: 25,
      windowMs: 86400000, // 24 ore
    },
  },

  // Simboli di test predefiniti
  testSymbols: {
    stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
    indices: ['^GSPC', '^IXIC', '^DJI'],
    volatility: ['^VIX', '^VXN'],
    treasuries: ['^IRX', '^TNX', '^TYX'],
  },

  // Impostazioni cache
  cache: {
    stockDataTtl: 300000, // 5 minuti
    fundamentalsTtl: 3600000, // 1 ora
    ratesTtl: 1800000, // 30 minuti
  },

  // Impostazioni UI
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

  // Impostazioni backup
  backup: {
    autoBackupInterval: 86400000, // 24 ore
    maxBackupSize: 10485760, // 10MB
  },

  // Debug e logging
  debug: {
    enabled: true,
    logLevel: 'info', // debug, info, warn, error
    logToConsole: true,
    logToSupabase: true,
  },
};

// Funzione per validare configurazione
function validateConfig() {
  const errors = [];

  if (!CONFIG.supabase.url || CONFIG.supabase.url.includes('{{')) {
    errors.push('❌ Supabase URL non configurato');
  }

  if (!CONFIG.supabase.anonKey || CONFIG.supabase.anonKey.includes('{{')) {
    errors.push('❌ Supabase ANON KEY non configurato');
  }

  if (errors.length > 0) {
    console.error('🚨 Errori di configurazione:', errors);
    return false;
  }

  console.log('✅ Configurazione validata con successo');
  return true;
}

// Esporta configurazione per compatibilità
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
