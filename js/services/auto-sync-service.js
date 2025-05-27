// =============================================
// AUTO SYNC SERVICE - Recupero automatico intelligente
// =============================================

class AutoSyncService {
  constructor(yahooService, supabaseClient) {
    this.yahooService = yahooService;
    this.db = supabaseClient;
    this.gapDetector = new DataGapDetector(supabaseClient);
    this.rateLimitManager = new RateLimitManager();

    // Configurazione
    this.config = {
      targetYears: 5, // Vogliamo 5 anni di dati
      maxDailyApiCalls: 2000, // Limite giornaliero Yahoo Finance
      callsPerHour: 100, // Rate limit orario
      batchSize: 50, // Record per batch
      syncIntervalMs: 3600000, // Sync ogni ora
      priorityThreshold: 0.8, // Soglia per simboli prioritari
    };

    // Stato
    this.isRunning = false;
    this.currentSync = null;
    this.syncHistory = [];
    this.intervals = [];

    // Simboli da monitorare (espansi)
    this.symbolsToMonitor = [
      // Originali
      'AAPL',
      'MSFT',
      'KO',
      'JNJ',
      'TSLA',
      // Aggiunti per completezza
      'GOOGL',
      'AMZN',
      'META',
      'NVDA',
      'NFLX',
      'V',
      'MA',
      'UNH',
      'HD',
      'PG',
      'BAC',
      'JPM',
      'WMT',
      'DIS',
      'ADBE',
    ];

    console.log('🤖 AutoSyncService: Inizializzato');
    console.log(
      `📊 Monitoraggio ${this.symbolsToMonitor.length} simboli per ${this.config.targetYears} anni`
    );
  }

  // ========================================
  // CONTROLLO PRINCIPALE
  // ========================================

  async startAutoSync() {
    if (this.isRunning) {
      console.log('⚠️ Auto sync già in esecuzione');
      return;
    }

    console.log('🚀 ==========================================');
    console.log('🚀 AVVIO AUTO SYNC INTELLIGENTE');
    console.log('🚀 ==========================================');

    this.isRunning = true;

    try {
      // 1. Analisi iniziale completa
      console.log('🔍 --- FASE 1: ANALISI DATI ESISTENTI ---');
      const analysisReport = await this.performFullAnalysis();
      this.logAnalysisReport(analysisReport);

      // 2. Sincronizzazione prioritaria
      console.log('⚡ --- FASE 2: SYNC PRIORITARIO ---');
      await this.performPrioritySync(analysisReport);

      // 3. Avvia monitoring continuo
      console.log('🔄 --- FASE 3: MONITORING CONTINUO ---');
      this.startContinuousMonitoring();

      console.log('✅ Auto sync avviato con successo');
    } catch (error) {
      console.error('❌ Errore avvio auto sync:', error);
      this.isRunning = false;
    }
  }

  async stopAutoSync() {
    console.log('⏹️ Fermando auto sync...');
    this.isRunning = false;

    // Ferma tutti gli intervalli
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    console.log('✅ Auto sync fermato');
  }

  // ========================================
  // ANALISI COMPLETA DATI ESISTENTI
  // ========================================

  async performFullAnalysis() {
    console.log('🔍 Analisi completa dati esistenti...');

    const report = {
      totalSymbols: this.symbolsToMonitor.length,
      analyzed: 0,
      symbolsAnalysis: {},
      summary: {
        complete: 0, // Simboli con dati completi (5 anni)
        partial: 0, // Simboli con dati parziali
        missing: 0, // Simboli senza dati
        totalGapDays: 0, // Giorni totali mancanti
        prioritySymbols: [], // Simboli da sincronizzare per primi
      },
    };

    for (const symbol of this.symbolsToMonitor) {
      console.log(`  🔍 Analizzando ${symbol}...`);

      try {
        const analysis = await this.gapDetector.analyzeSymbolGaps(
          symbol,
          this.config.targetYears
        );
        report.symbolsAnalysis[symbol] = analysis;
        report.analyzed++;

        // Aggiorna statistiche
        if (analysis.completionPercentage >= 95) {
          report.summary.complete++;
        } else if (analysis.completionPercentage > 0) {
          report.summary.partial++;
        } else {
          report.summary.missing++;
        }

        report.summary.totalGapDays += analysis.totalGapDays;

        // Identifica simboli prioritari (con molti gap)
        if (
          analysis.completionPercentage <
          this.config.priorityThreshold * 100
        ) {
          report.summary.prioritySymbols.push({
            symbol: symbol,
            priority: 100 - analysis.completionPercentage,
            gapDays: analysis.totalGapDays,
          });
        }

        console.log(
          `    ✅ ${symbol}: ${analysis.completionPercentage.toFixed(1)}% completo (${analysis.totalGapDays} giorni mancanti)`
        );
      } catch (error) {
        console.error(`    ❌ Errore analisi ${symbol}:`, error.message);
        report.symbolsAnalysis[symbol] = { error: error.message };
      }

      // Pausa per non sovraccaricare
      await this.delay(100);
    }

    // Ordina priorità per gap decrescenti
    report.summary.prioritySymbols.sort((a, b) => b.priority - a.priority);

    return report;
  }

  logAnalysisReport(report) {
    console.log('\n📊 ==========================================');
    console.log('📊 REPORT ANALISI DATI');
    console.log('📊 ==========================================');
    console.log(
      `📈 Simboli analizzati: ${report.analyzed}/${report.totalSymbols}`
    );
    console.log(`✅ Completi (95%+): ${report.summary.complete}`);
    console.log(`🟡 Parziali: ${report.summary.partial}`);
    console.log(`❌ Mancanti: ${report.summary.missing}`);
    console.log(
      `📅 Giorni totali mancanti: ${report.summary.totalGapDays.toLocaleString()}`
    );
    console.log(
      `⚡ Simboli prioritari: ${report.summary.prioritySymbols.length}`
    );

    if (report.summary.prioritySymbols.length > 0) {
      console.log('\n🎯 TOP 10 PRIORITÀ:');
      report.summary.prioritySymbols.slice(0, 10).forEach((item, index) => {
        console.log(
          `  ${index + 1}. ${item.symbol}: ${item.priority.toFixed(1)}% priorità (${item.gapDays} giorni)`
        );
      });
    }
    console.log('📊 ==========================================\n');
  }

  // ========================================
  // SINCRONIZZAZIONE PRIORITARIA
  // ========================================

  async performPrioritySync(analysisReport) {
    const prioritySymbols = analysisReport.summary.prioritySymbols;

    if (prioritySymbols.length === 0) {
      console.log('✅ Tutti i simboli sono già aggiornati!');
      return;
    }

    console.log(
      `⚡ Sincronizzazione prioritaria di ${prioritySymbols.length} simboli...`
    );
    console.log(`📊 Strategia: Chunk intelligenti + Rate limiting aggressivo`);

    let processedCount = 0;
    let successCount = 0;
    let totalRecordsAdded = 0;

    for (const priorityItem of prioritySymbols) {
      const symbol = priorityItem.symbol;

      console.log(
        `\n🔄 [${processedCount + 1}/${prioritySymbols.length}] === SYNC ${symbol} ===`
      );
      console.log(
        `   Priority Score: ${priorityItem.priority.toFixed(1)}% | Gap Days: ${priorityItem.gapDays}`
      );

      // Verifica rate limit globale
      if (!this.rateLimitManager.canMakeRequest('yahoo')) {
        const waitTime = this.rateLimitManager.getWaitTime('yahoo');
        console.log(
          `⏳ Rate limit globale raggiunto. Attendo ${Math.ceil(waitTime / 1000)}s...`
        );
        await this.delay(waitTime + 5000); // +5s di sicurezza
      }

      try {
        const syncResult = await this.syncSymbolIntelligent(symbol);

        if (syncResult.success) {
          successCount++;
          totalRecordsAdded += syncResult.newRecords;
          console.log(`✅ ${symbol} COMPLETATO:`);
          console.log(`   📊 ${syncResult.newRecords} nuovi record aggiunti`);
          console.log(`   📦 ${syncResult.chunksProcessed} chunk processati`);
        } else {
          console.log(`❌ ${symbol} FALLITO: ${syncResult.error}`);
        }

        processedCount++;

        // Pausa significativa tra simboli per essere sicuri
        console.log(`   ⏳ Pausa 10s prima del prossimo simbolo...`);
        await this.delay(10000);
      } catch (error) {
        console.error(`💥 Errore fatale sync ${symbol}:`, error.message);
        processedCount++;

        // Pausa ancora più lunga se c'è un errore
        await this.delay(15000);
      }

      // Stop se non siamo più in running
      if (!this.isRunning) {
        console.log(
          `⏹️ Sync fermato dall'utente dopo ${processedCount} simboli`
        );
        break;
      }

      // Progress report ogni 5 simboli
      if (processedCount % 5 === 0) {
        const progress = (
          (processedCount / prioritySymbols.length) *
          100
        ).toFixed(1);
        console.log(`\n📊 === PROGRESS REPORT ===`);
        console.log(
          `📈 Avanzamento: ${progress}% (${processedCount}/${prioritySymbols.length})`
        );
        console.log(`✅ Successi: ${successCount}/${processedCount}`);
        console.log(
          `📊 Record totali aggiunti: ${totalRecordsAdded.toLocaleString()}`
        );
        console.log(
          `⚡ Rate limit status:`,
          this.rateLimitManager.getStatus().yahoo
        );
        console.log(`=========================\n`);
      }
    }

    // Report finale
    console.log(`\n⚡ === PRIORITY SYNC COMPLETATO ===`);
    console.log(`📊 Risultati: ${successCount}/${processedCount} successi`);
    console.log(
      `📈 Record totali aggiunti: ${totalRecordsAdded.toLocaleString()}`
    );
    console.log(
      `⏱️ Rate limit finale:`,
      this.rateLimitManager.getStatus().yahoo
    );
    console.log(`=======================================`);
  }

  // ========================================
  // SYNC INTELLIGENTE PER SINGOLO SIMBOLO
  // ========================================

  async syncSymbolIntelligent(symbol) {
    console.log(`🧠 Sync intelligente per ${symbol}...`);

    try {
      // 1. Analizza gap attuali
      const gaps = await this.gapDetector.analyzeSymbolGaps(
        symbol,
        this.config.targetYears
      );

      if (gaps.gapPeriods.length === 0) {
        return { success: true, newRecords: 0, message: 'Già completo' };
      }

      console.log(`  📊 Trovati ${gaps.gapPeriods.length} gap da riempire`);

      let totalNewRecords = 0;
      let totalChunks = 0;

      // 2. Riempi ogni gap con CHUNKING INTELLIGENTE
      for (const gap of gaps.gapPeriods) {
        console.log(
          `    📅 Gap: ${gap.startDate} → ${gap.endDate} (${gap.days} giorni)`
        );

        try {
          // 🔧 SUDDIVIDI GAP GRANDI IN CHUNK PICCOLI
          const chunks = this.createSmartChunks(
            gap.startDate,
            gap.endDate,
            gap.days
          );
          console.log(`      🔪 Suddiviso in ${chunks.length} chunk`);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            totalChunks++;

            console.log(
              `        📦 Chunk ${i + 1}/${chunks.length}: ${chunk.startDate} → ${chunk.endDate} (${chunk.days} giorni)`
            );

            // Verifica rate limit prima di ogni chunk
            if (!this.rateLimitManager.canMakeRequest('yahoo')) {
              const waitTime = this.rateLimitManager.getWaitTime('yahoo');
              console.log(
                `          ⏳ Rate limit - Attendo ${Math.ceil(waitTime / 1000)}s...`
              );
              await this.delay(waitTime + 1000); // +1s di sicurezza
            }

            try {
              // Recupera dati per questo chunk
              const historicalData =
                await this.yahooService.getHistoricalDataAsync(
                  symbol,
                  new Date(chunk.startDate),
                  new Date(chunk.endDate)
                );

              if (historicalData.length > 0) {
                // Salva nel database
                await this.yahooService.saveStockDataToDatabase(historicalData);
                totalNewRecords += historicalData.length;

                console.log(
                  `          ✅ Chunk completato: ${historicalData.length} record salvati`
                );
              } else {
                console.log(
                  `          ⚠️ Chunk vuoto - nessun dato disponibile`
                );
              }

              // Registra chiamata API
              this.rateLimitManager.recordApiCall('yahoo');

              // Pausa tra chunk per rispettare rate limit
              await this.delay(2000); // 2 secondi tra chunk
            } catch (chunkError) {
              console.error(
                `          ❌ Errore chunk ${chunk.startDate}:`,
                chunkError.message
              );

              // Se è un errore di rate limit, aspetta di più
              if (
                chunkError.message.includes('rate') ||
                chunkError.message.includes('limit')
              ) {
                console.log(`          ⏳ Rate limit detectato - pausa 30s`);
                await this.delay(30000);
              }
            }

            // Controllo per fermare se necessario
            if (!this.isRunning) {
              console.log(`          ⏹️ Sync fermato dall'utente`);
              break;
            }
          }
        } catch (gapError) {
          console.error(
            `      ❌ Errore gap ${gap.startDate}:`,
            gapError.message
          );
        }

        // Se non siamo più in running, esci
        if (!this.isRunning) break;
      }

      return {
        success: true,
        newRecords: totalNewRecords,
        gapsFilled: gaps.gapPeriods.length,
        chunksProcessed: totalChunks,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  createSmartChunks(startDate, endDate, totalDays) {
    const chunks = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 🔧 STRATEGIA CHUNKING INTELLIGENTE
    let chunkSizeMonths;
    if (totalDays > 1000) {
      chunkSizeMonths = 3; // Gap molto grandi: 3 mesi alla volta
    } else if (totalDays > 500) {
      chunkSizeMonths = 6; // Gap grandi: 6 mesi alla volta
    } else if (totalDays > 100) {
      chunkSizeMonths = 12; // Gap medi: 1 anno alla volta
    } else {
      // Gap piccoli: tutto insieme
      return [
        {
          startDate: startDate,
          endDate: endDate,
          days: totalDays,
        },
      ];
    }

    console.log(
      `      🧠 Strategia chunking: ${chunkSizeMonths} mesi per chunk (${totalDays} giorni totali)`
    );

    let currentStart = new Date(start);

    while (currentStart < end) {
      // Calcola fine chunk
      const chunkEnd = new Date(currentStart);
      chunkEnd.setMonth(chunkEnd.getMonth() + chunkSizeMonths);

      // Non superare la data finale
      if (chunkEnd > end) {
        chunkEnd.setTime(end.getTime());
      }

      // Calcola giorni approssimativi per questo chunk
      const chunkDays = Math.floor(
        (chunkEnd - currentStart) / (1000 * 60 * 60 * 24)
      );

      chunks.push({
        startDate: currentStart.toISOString().split('T')[0],
        endDate: chunkEnd.toISOString().split('T')[0],
        days: chunkDays,
      });

      // Prossimo chunk
      currentStart = new Date(chunkEnd);
      currentStart.setDate(currentStart.getDate() + 1); // +1 giorno per evitare sovrapposizioni
    }

    return chunks;
  }
  // ========================================
  // MONITORING CONTINUO
  // ========================================

  startContinuousMonitoring() {
    console.log('🔄 Avvio monitoring continuo...');

    // Sync completo ogni 6 ore
    const fullSyncInterval = setInterval(async () => {
      if (this.isRunning) {
        console.log('🔄 Sync automatico programmato...');
        await this.performIncrementalSync();
      }
    }, 6 * 3600000); // 6 ore

    // Update simboli più attivi ogni ora
    const quickSyncInterval = setInterval(async () => {
      if (this.isRunning) {
        console.log('⚡ Quick sync simboli attivi...');
        await this.performQuickSync();
      }
    }, 3600000); // 1 ora

    this.intervals.push(fullSyncInterval, quickSyncInterval);
    console.log('✅ Monitoring continuo attivato');
  }

  async performIncrementalSync() {
    console.log('🔄 Esecuzione sync incrementale...');

    // Analizza solo simboli che potrebbero aver bisogno di aggiornamenti
    const recentSymbols = this.symbolsToMonitor.slice(0, 10); // Top 10 per ora

    for (const symbol of recentSymbols) {
      if (!this.rateLimitManager.canMakeRequest('yahoo')) break;

      try {
        const result = await this.syncSymbolIntelligent(symbol);
        if (result.newRecords > 0) {
          console.log(`✅ ${symbol}: +${result.newRecords} record`);
        }
        this.rateLimitManager.recordApiCall('yahoo');
        await this.delay(5000); // 5 secondi tra simboli
      } catch (error) {
        console.warn(`⚠️ Errore sync incrementale ${symbol}:`, error.message);
      }
    }
  }

  async performQuickSync() {
    console.log('⚡ Esecuzione quick sync...');

    // Solo i simboli più importanti con update recenti
    const quickSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];

    for (const symbol of quickSymbols) {
      if (!this.rateLimitManager.canMakeRequest('yahoo')) break;

      try {
        // Solo ultimi 7 giorni
        const recentData = await this.gapDetector.checkRecentDataGaps(
          symbol,
          7
        );
        if (recentData.hasGaps) {
          const result = await this.syncSymbolIntelligent(symbol);
          console.log(
            `⚡ ${symbol}: quick sync completed (${result.newRecords} record)`
          );
        }
        this.rateLimitManager.recordApiCall('yahoo');
        await this.delay(2000);
      } catch (error) {
        console.warn(`⚠️ Errore quick sync ${symbol}:`, error.message);
      }
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentSync: this.currentSync,
      rateLimitStatus: this.rateLimitManager.getStatus(),
      monitoredSymbols: this.symbolsToMonitor.length,
      config: this.config,
    };
  }

  async getProgressReport() {
    const report = await this.performFullAnalysis();
    return {
      completionPercentage: (
        (report.summary.complete / report.totalSymbols) *
        100
      ).toFixed(1),
      totalGapDays: report.summary.totalGapDays,
      prioritySymbols: report.summary.prioritySymbols.length,
      lastUpdate: new Date().toISOString(),
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Esporta per uso globale
window.AutoSyncService = AutoSyncService;
console.log('📄 auto-sync-service.js caricato');
