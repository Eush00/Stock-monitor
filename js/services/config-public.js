const CONFIG = {
  supabase: {
    url: 'https://dxsrlekdnsppvomlqikj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },

  // Configurazioni limitate
  sync: {
    enabled: true,
    intervalMs: 3600000, // 1 ora
    maxSymbols: 20,
    safeMode: true,
  },

  // Simboli fissi (no admin control)
  symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],

  // Controllo remoto via Supabase
  controlTable: 'sync_control',
};
