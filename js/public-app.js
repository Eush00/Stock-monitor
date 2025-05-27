// =============================================
// PUBLIC APP - Controller principale per GitHub Pages
// Usa i servizi esistenti senza modificarli
// =============================================

class PublicStockMonitor {
  constructor() {
    this.supabaseClient = null;
    this.autoSyncService = null;
    this.isInitialized = false;
    this.isRunning = false;
    this.stats = {
      recordsToday: 0,
      apiCallsUsed: 0,
      symbolsActive: 0,
      lastSyncTime: null,
      status: 'INITIALIZING',
    };
    this.controlCheckInterval = null;
  }

  // ========================================
  // INIZIALIZZAZIONE
  // ========================================
  async initialize() {
    try {
      this.updateStatus('INITIALIZING', 'Caricamento servizi...');

      if (!validateConfig()) {
        throw new Error('Configurazione non valida');
      }

      // 1. Inizializza Supabase (usando codice esistente)
      this.supabaseClient = new SupabaseClient();
      await this.supabaseClient.initialize();
      console.log('✅ Supabase connesso');

      // 2. Inizializza Auto Sync Service (usando codice esistente)
      this.autoSyncService = new AutoSyncService(
        new YahooFinanceService(this.supabaseClient),
        this.supabaseClient
      );
      console.log('✅ Auto Sync Service inizializzato');

      // 3. Avvia controllo remoto
      this.startRemoteControl();
      console.log('✅ Controllo remoto attivato');

      // 4. Avvia sync automatico se abilitato
      if (CONFIG.sync.enabled) {
        await this.startAutoSync();
      }

      this.isInitialized = true;
      this.updateStatus('READY', 'Servizio operativo');

      // 5. Avvia monitoring statistiche
      this.startStatsMonitoring();

      console.log('🎉 Public Stock Monitor inizializzato');
    } catch (error) {
      console.error('❌ Errore inizializzazione:', error);
      this.updateStatus('ERROR', `Errore: ${error.message}`);
    }
  }

  // ========================================
  // CONTROLLO REMOTO (dal dashboard admin)
  // ========================================
  startRemoteControl() {
    this.controlCheckInterval = setInterval(async () => {
      try {
        await this.checkRemoteCommands();
      } catch (error) {
        console.error('❌ Errore controllo remoto:', error);
      }
    }, CONFIG.control.checkIntervalMs);
  }

  async checkRemoteCommands() {
    const { data, error } = await this.supabaseClient.client
      .from(CONFIG.control.tableName)
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) {
      console.error('❌ Errore lettura comandi:', error);
      return;
    }

    if (data && data.length > 0) {
      for (const command of data) {
        await this.executeRemoteCommand(command);
      }
    }
  }

  async executeRemoteCommand(command) {
    console.log(`🎛️ Esecuzione comando: ${command.action}`);

    try {
      switch (command.action) {
        case 'START_SYNC':
          if (!this.isRunning) {
            await this.startAutoSync();
          }
          break;

        case 'STOP_SYNC':
          if (this.isRunning) {
            await this.stopAutoSync();
          }
          break;

        case 'RESTART_SYNC':
          await this.stopAutoSync();
          await this.delay(2000);
          await this.startAutoSync();
          break;

        case 'UPDATE_SYMBOLS':
          // Aggiorna simboli target (se forniti nel comando)
          if (command.data && command.data.symbols) {
            CONFIG.targetSymbols = command.data.symbols;
            console.log('📝 Simboli aggiornati:', CONFIG.targetSymbols);
          }
          break;

        case 'GET_STATUS':
          // Invia statistiche aggiornate
          await this.sendStatsToAdmin();
          break;

        default:
          console.warn(`⚠️ Comando sconosciuto: ${command.action}`);
      }

      // Marca comando come processato
      await this.markCommandProcessed(command.id);
    } catch (error) {
      console.error(`❌ Errore esecuzione comando ${command.action}:`, error);
      await this.markCommandProcessed(command.id, error.message);
    }
  }

  async markCommandProcessed(commandId, errorMessage = null) {
    await this.supabaseClient.client
      .from(CONFIG.control.tableName)
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', commandId);
  }

  // ========================================
  // SYNC MANAGEMENT (usa servizi esistenti)
  // ========================================
  async startAutoSync() {
    try {
      this.updateStatus('STARTING', 'Avvio sincronizzazione...');

      // Usa il servizio esistente senza modifiche
      await this.autoSyncService.startAutoSync();

      this.isRunning = true;
      this.updateStatus('RUNNING', 'Sincronizzazione attiva');

      console.log('🚀 Auto sync avviato');
    } catch (error) {
      console.error('❌ Errore avvio sync:', error);
      this.updateStatus('ERROR', `Errore sync: ${error.message}`);
    }
  }

  async stopAutoSync() {
    try {
      this.updateStatus('STOPPING', 'Arresto sincronizzazione...');

      await this.autoSyncService.stopAutoSync();

      this.isRunning = false;
      this.updateStatus('STOPPED', 'Sincronizzazione fermata');

      console.log('⏹️ Auto sync fermato');
    } catch (error) {
      console.error('❌ Errore stop sync:', error);
    }
  }

  // ========================================
  // MONITORING STATISTICHE
  // ========================================
  startStatsMonitoring() {
    // Aggiorna stats ogni 30 secondi
    setInterval(async () => {
      await this.updateStats();
      this.updateUI();
    }, 30000);

    // Invia stats all'admin ogni 5 minuti
    setInterval(async () => {
      await this.sendStatsToAdmin();
    }, 300000);
  }

  async updateStats() {
    try {
      // Recupera statistiche dal database
      const dbStats = await this.supabaseClient.getDatabaseStats();

      this.stats.recordsToday = dbStats.stock_data_count || 0;
      this.stats.symbolsActive = CONFIG.targetSymbols.length;
      this.stats.lastSyncTime = new Date();

      // Stato del sync service
      if (this.autoSyncService) {
        const syncStatus = this.autoSyncService.getStatus();
        this.stats.status = syncStatus.isRunning ? 'RUNNING' : 'STOPPED';
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento stats:', error);
      this.stats.status = 'ERROR';
    }
  }

  async sendStatsToAdmin() {
    try {
      const statsData = {
        ...this.stats,
        timestamp: new Date().toISOString(),
        public_service: true,
      };

      await this.supabaseClient.client.from('service_stats').insert(statsData);
    } catch (error) {
      console.error('❌ Errore invio stats:', error);
    }
  }

  // ========================================
  // UI UPDATE
  // ========================================
  updateStatus(status, message) {
    this.stats.status = status;

    const statusEl = document.querySelector('.service-status');
    const indicatorEl = document.querySelector('.status-indicator');

    if (statusEl) {
      statusEl.textContent = message;
    }

    // Cambia colore indicatore basato sullo stato
    if (indicatorEl) {
      indicatorEl.className = 'status-indicator';
      if (status === 'ERROR') {
        indicatorEl.classList.add('error');
      }
    }
  }

  updateUI() {
    // Aggiorna valori statistiche
    const elements = {
      'records-today': this.stats.recordsToday.toLocaleString(),
      'api-calls': this.stats.apiCallsUsed,
      'symbols-active': this.stats.symbolsActive,
      'last-update': this.stats.lastSyncTime
        ? this.stats.lastSyncTime.toLocaleTimeString()
        : 'Mai',
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    // Aggiorna timestamp globale
    const timestampEl = document.querySelector('.last-update');
    if (timestampEl) {
      timestampEl.textContent = `Aggiornato: ${new Date().toLocaleTimeString()}`;
    }
  }

  // ========================================
  // UTILITY
  // ========================================
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ========================================
// AUTO-START
// ========================================
let publicMonitor;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌟 Avvio Public Stock Monitor...');

  publicMonitor = new PublicStockMonitor();
  await publicMonitor.initialize();
});

// Esporta per debug
window.publicMonitor = publicMonitor;

console.log('📄 public-app.js caricato');
