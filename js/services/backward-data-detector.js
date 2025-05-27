// =============================================
// BACKWARD DATA DETECTOR - Trova dati mancanti ALL'INDIETRO
// =============================================

class BackwardDataDetector {
  constructor(supabaseClient) {
    this.db = supabaseClient;
    this.logger = window.logger;
    console.log('🔍 BackwardDataDetector: Inizializzato');
  }

  // ========================================
  // ANALISI PRINCIPALE: TROVA COSA MANCA PRIMA DEI DATI ESISTENTI
  // ========================================

  async analyzeBackwardGaps(symbol, targetYears = 5) {
    this.logger?.log(
      `🔍 Analisi backward gap per ${symbol} (${targetYears} anni)...`
    );

    try {
      // 1. Trova i dati più vecchi esistenti
      const oldestData = await this.getOldestExistingData(symbol);

      if (!oldestData) {
        // Nessun dato esistente - recupera tutto
        return this.createFullRangeGap(symbol, targetYears);
      }

      const oldestDate = new Date(oldestData.date);
      this.logger?.log(
        `📅 Dato più vecchio esistente: ${oldestDate.toISOString().split('T')[0]}`
      );

      // 2. Calcola fino a dove vogliamo andare indietro
      const targetStartDate = new Date();
      targetStartDate.setFullYear(targetStartDate.getFullYear() - targetYears);

      this.logger?.log(
        `📅 Target start date: ${targetStartDate.toISOString().split('T')[0]}`
      );

      // 3. Se i dati esistenti sono già abbastanza vecchi, non serve nulla
      if (oldestDate <= targetStartDate) {
        this.logger?.log(`✅ ${symbol} ha già dati sufficientemente vecchi`);
        return {
          symbol: symbol,
          needsBackwardSync: false,
          message: 'Dati già completi per il periodo target',
        };
      }

      // 4. Calcola il gap da riempire (DA targetStartDate FINO al dato più vecchio)
      const gapEndDate = new Date(oldestDate);
      gapEndDate.setDate(gapEndDate.getDate() - 1); // Un giorno prima del dato esistente

      const tradingDays = this.calculateTradingDays(
        targetStartDate,
        gapEndDate
      );

      return {
        symbol: symbol,
        needsBackwardSync: true,
        oldestExistingDate: oldestDate.toISOString().split('T')[0],
        targetStartDate: targetStartDate.toISOString().split('T')[0],
        gapStartDate: targetStartDate.toISOString().split('T')[0],
        gapEndDate: gapEndDate.toISOString().split('T')[0],
        estimatedMissingDays: tradingDays,
        priority: tradingDays, // Più giorni mancanti = più priorità
      };
    } catch (error) {
      this.logger?.error(`❌ Errore analisi backward per ${symbol}:`, error);
      throw error;
    }
  }

  // ========================================
  // TROVA DATO PIÙ VECCHIO ESISTENTE
  // ========================================

  async getOldestExistingData(symbol) {
    try {
      const { data, error } = await this.db.client
        .from('stock_data')
        .select('date, symbol')
        .eq('symbol', symbol)
        .order('date', { ascending: true }) // ASCENDING = più vecchio prima
        .limit(1);

      if (error) {
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      this.logger?.error(
        `❌ Errore recupero dato più vecchio per ${symbol}:`,
        error
      );
      return null;
    }
  }

  // ========================================
  // CREA GAP COMPLETO (se non ci sono dati)
  // ========================================

  createFullRangeGap(symbol, targetYears) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Ieri

    const startDate = new Date(endDate);
    startDate.setFullYear(endDate.getFullYear() - targetYears);

    const tradingDays = this.calculateTradingDays(startDate, endDate);

    this.logger?.log(
      `📊 ${symbol} - Nessun dato esistente, gap completo: ${tradingDays} giorni`
    );

    return {
      symbol: symbol,
      needsBackwardSync: true,
      oldestExistingDate: null,
      targetStartDate: startDate.toISOString().split('T')[0],
      gapStartDate: startDate.toISOString().split('T')[0],
      gapEndDate: endDate.toISOString().split('T')[0],
      estimatedMissingDays: tradingDays,
      priority: tradingDays * 2, // Doppia priorità se non ci sono dati
    };
  }

  // ========================================
  // CALCOLA GIORNI DI TRADING
  // ========================================

  calculateTradingDays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Solo giorni feriali (lun-ven)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  // ========================================
  // ANALISI MULTIPLI SIMBOLI
  // ========================================

  async analyzeAllSymbolsBackward(symbols, targetYears = 5) {
    this.logger?.log(`🔍 Analisi backward per ${symbols.length} simboli...`);

    const results = {
      analyzed: 0,
      needSync: [],
      complete: [],
      totalMissingDays: 0,
      errors: [],
    };

    for (const symbol of symbols) {
      try {
        const analysis = await this.analyzeBackwardGaps(symbol, targetYears);
        results.analyzed++;

        if (analysis.needsBackwardSync) {
          results.needSync.push(analysis);
          results.totalMissingDays += analysis.estimatedMissingDays;
        } else {
          results.complete.push(analysis);
        }

        this.logger?.log(
          `  ✅ ${symbol}: ${analysis.needsBackwardSync ? analysis.estimatedMissingDays + ' giorni mancanti' : 'completo'}`
        );
      } catch (error) {
        results.errors.push({ symbol, error: error.message });
        this.logger?.error(`  ❌ ${symbol}: ${error.message}`);
      }

      // Piccola pausa per non sovraccaricare
      await this.delay(100);
    }

    // Ordina per priorità (più giorni mancanti prima)
    results.needSync.sort((a, b) => b.priority - a.priority);

    this.logger?.log(`📊 Analisi backward completata:`);
    this.logger?.log(`   ✅ Completi: ${results.complete.length}`);
    this.logger?.log(`   🔄 Da sincronizzare: ${results.needSync.length}`);
    this.logger?.log(
      `   📅 Giorni totali mancanti: ${results.totalMissingDays.toLocaleString()}`
    );

    return results;
  }

  // ========================================
  // VERIFICA STATO SIMBOLO SINGOLO
  // ========================================

  async getSymbolStatus(symbol) {
    try {
      const { data, error } = await this.db.client
        .from('stock_data')
        .select('date')
        .eq('symbol', symbol)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;

      const newestDate = data.length > 0 ? data[0].date : null;
      const oldestDate = data.length > 0 ? data[data.length - 1].date : null;
      const recordCount = data.length;

      return {
        symbol,
        hasData: recordCount > 0,
        recordCount,
        newestDate,
        oldestDate,
        dataRange:
          newestDate && oldestDate
            ? `${oldestDate} → ${newestDate}`
            : 'No data',
      };
    } catch (error) {
      return {
        symbol,
        hasData: false,
        error: error.message,
      };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Esporta per uso globale
window.BackwardDataDetector = BackwardDataDetector;
console.log('📄 backward-data-detector.js caricato');
