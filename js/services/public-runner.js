class PublicDataRunner {
  constructor() {
    this.isRunning = false;
    this.syncService = null;
    this.controlChecker = null;
  }

  async initialize() {
    try {
      // Inizializza servizi
      this.supabaseClient = new SupabaseClient();
      await this.supabaseClient.initialize();

      this.syncService = new BackgroundSyncService();

      // Controlla comandi dal dashboard admin
      this.startControlListener();

      // Avvia sync automatico se abilitato
      if (CONFIG.sync.enabled) {
        await this.startAutoSync();
      }

      this.updateStatus('RUNNING');
    } catch (error) {
      console.error('Initialization failed:', error);
      this.updateStatus('ERROR');
    }
  }

  async startControlListener() {
    // Ascolta comandi dal dashboard admin
    setInterval(async () => {
      try {
        const { data } = await this.supabaseClient.client
          .from(CONFIG.controlTable)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const command = data[0];
          await this.handleCommand(command);
        }
      } catch (error) {
        console.error('Control check failed:', error);
      }
    }, 30000); // Controlla ogni 30 secondi
  }

  async handleCommand(command) {
    switch (command.action) {
      case 'START':
        if (!this.isRunning) await this.startAutoSync();
        break;
      case 'STOP':
        if (this.isRunning) await this.stopAutoSync();
        break;
      case 'UPDATE_SYMBOLS':
        this.updateSymbols(command.symbols);
        break;
    }

    // Marca comando come processato
    await this.markCommandProcessed(command.id);
  }

  async startAutoSync() {
    this.isRunning = true;
    await this.syncService.start();
    this.updateStatus('SYNCING');
  }

  async stopAutoSync() {
    this.isRunning = false;
    await this.syncService.stop();
    this.updateStatus('STOPPED');
  }

  updateStatus(status) {
    const statusEl = document.querySelector('.status p');
    const updateEl = document.getElementById('last-update');

    statusEl.textContent = `Service ${status}`;
    updateEl.textContent = new Date().toLocaleString();
  }
}

// Auto-start
document.addEventListener('DOMContentLoaded', async () => {
  const runner = new PublicDataRunner();
  await runner.initialize();
});
