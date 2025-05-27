// =============================================
// DATA GAP DETECTOR - Analisi intelligente gap dati
// =============================================

class DataGapDetector {
  constructor(supabaseClient) {
    this.db = supabaseClient;
    console.log('🔍 DataGapDetector: Inizializzato');
  }

  // ========================================
  // ANALISI PRINCIPAL PER SIMBOLO
  // ========================================

  async analyzeSymbolGaps(symbol, targetYears = 5) {
    console.log(`🔍 Analisi gap per ${symbol} (${targetYears} anni)...`);

    try {
      // 1. Calcola periodo target - FIX DATE FUTURE
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1); // IERI, non oggi (evita dati futuri)

      const startDate = new Date(endDate);
      startDate.setFullYear(endDate.getFullYear() - targetYears);

      console.log(
        `  📅 Periodo target CORRETTO: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`
      );

      // Verifica che non ci siano date future
      if (endDate > today) {
        console.warn(
          `  ⚠️ Data finale corretta da ${endDate.toISOString().split('T')[0]} a ${today.toISOString().split('T')[0]}`
        );
        endDate.setTime(today.getTime());
      }

      // 2. Recupera dati esistenti
      const existingData = await this.getExistingData(
        symbol,
        startDate,
        endDate
      );
      console.log(`  📊 Dati esistenti: ${existingData.length} record`);

      // 3. Genera calendario completo (solo giorni feriali)
      const completeCalendar = this.generateTradingCalendar(startDate, endDate);
      console.log(`  📅 Giorni trading attesi: ${completeCalendar.length}`);

      // 4. Identifica gap
      const gapAnalysis = this.identifyGaps(existingData, completeCalendar);

      // 5. Calcola statistiche
      const analysis = {
        symbol: symbol,
        targetPeriod: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalTradingDays: completeCalendar.length,
        },
        existingData: {
          recordCount: existingData.length,
          firstDate:
            existingData.length > 0
              ? existingData[existingData.length - 1].date
              : null,
          lastDate: existingData.length > 0 ? existingData[0].date : null,
        },
        gapAnalysis: gapAnalysis,
        completionPercentage:
          (existingData.length / completeCalendar.length) * 100,
        totalGapDays: gapAnalysis.totalGapDays,
        gapPeriods: gapAnalysis.gapPeriods,
      };

      console.log(
        `  ✅ Analisi completata: ${analysis.completionPercentage.toFixed(1)}% completo`
      );
      return analysis;
    } catch (error) {
      console.error(`❌ Errore analisi gap per ${symbol}:`, error);
      throw error;
    }
  }

  // ========================================
  // RECUPERO DATI ESISTENTI
  // ========================================

  async getExistingData(symbol, startDate, endDate) {
    try {
      const { data, error } = await this.db.client
        .from('stock_data')
        .select('date, symbol')
        .eq('symbol', symbol)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(`❌ Errore recupero dati esistenti per ${symbol}:`, error);
      return [];
    }
  }

  // ========================================
  // GENERAZIONE CALENDARIO TRADING
  // ========================================

  generateTradingCalendar(startDate, endDate) {
    const calendar = [];
    const current = new Date(startDate);

    // Holiday principali US (semplificato)
    const holidays = this.getUSHolidays();

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];

      // Aggiungi solo giorni feriali (lun-ven) che non sono holiday
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays.includes(dateStr)) {
        calendar.push(dateStr);
      }

      current.setDate(current.getDate() + 1);
    }

    return calendar;
  }

  getUSHolidays() {
    // Holiday fissi US per ultimi 5 anni (semplificato)
    return [
      // 2024
      '2024-01-01',
      '2024-01-15',
      '2024-02-19',
      '2024-03-29',
      '2024-05-27',
      '2024-06-19',
      '2024-07-04',
      '2024-09-02',
      '2024-10-14',
      '2024-11-11',
      '2024-11-28',
      '2024-12-25',
      // 2023
      '2023-01-02',
      '2023-01-16',
      '2023-02-20',
      '2023-04-07',
      '2023-05-29',
      '2023-06-19',
      '2023-07-04',
      '2023-09-04',
      '2023-10-09',
      '2023-11-10',
      '2023-11-23',
      '2023-12-25',
      // Aggiungi altri anni se necessario...
    ];
  }

  // ========================================
  // IDENTIFICAZIONE GAP
  // ========================================

  identifyGaps(existingData, completeCalendar) {
    // Converti dati esistenti in Set per lookup veloce
    const existingDates = new Set(existingData.map(d => d.date));

    const gaps = [];
    let currentGapStart = null;
    let totalGapDays = 0;

    for (const expectedDate of completeCalendar) {
      if (!existingDates.has(expectedDate)) {
        // Giorno mancante
        totalGapDays++;

        if (currentGapStart === null) {
          // Inizio nuovo gap
          currentGapStart = expectedDate;
        }
      } else {
        // Giorno presente - chiudi gap se aperto
        if (currentGapStart !== null) {
          gaps.push({
            startDate: currentGapStart,
            endDate: this.getPreviousTradingDay(expectedDate),
            days: this.countGapDays(currentGapStart, expectedDate),
          });
          currentGapStart = null;
        }
      }
    }

    // Chiudi ultimo gap se rimasto aperto
    if (currentGapStart !== null) {
      gaps.push({
        startDate: currentGapStart,
        endDate: completeCalendar[completeCalendar.length - 1],
        days:
          this.countGapDays(
            currentGapStart,
            completeCalendar[completeCalendar.length - 1]
          ) + 1,
      });
    }

    // Ordina gap per importanza (più lunghi prima)
    gaps.sort((a, b) => b.days - a.days);

    return {
      totalGapDays: totalGapDays,
      gapCount: gaps.length,
      gapPeriods: gaps,
      largestGap: gaps.length > 0 ? gaps[0] : null,
    };
  }

  countGapDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    const current = new Date(start);

    while (current < end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Solo giorni feriali
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  getPreviousTradingDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);

    // Se è weekend, va al venerdì precedente
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() - 1);
    }

    return date.toISOString().split('T')[0];
  }

  // ========================================
  // CHECK GAP RECENTI (per quick sync)
  // ========================================

  async checkRecentDataGaps(symbol, days = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    try {
      const existingData = await this.getExistingData(
        symbol,
        startDate,
        endDate
      );
      const expectedCalendar = this.generateTradingCalendar(startDate, endDate);

      const hasGaps = existingData.length < expectedCalendar.length;
      const missingDays = expectedCalendar.length - existingData.length;

      return {
        symbol: symbol,
        hasGaps: hasGaps,
        missingDays: missingDays,
        expectedDays: expectedCalendar.length,
        actualDays: existingData.length,
        completionPercentage:
          (existingData.length / expectedCalendar.length) * 100,
      };
    } catch (error) {
      console.error(`❌ Errore check recent gaps ${symbol}:`, error);
      return { symbol, hasGaps: false, error: error.message };
    }
  }

  // ========================================
  // STATISTICHE GLOBALI
  // ========================================

  async getGlobalDataStats(symbols) {
    console.log('📊 Calcolo statistiche globali...');

    const stats = {
      totalSymbols: symbols.length,
      analyzed: 0,
      totalExpectedDays: 0,
      totalActualDays: 0,
      totalGapDays: 0,
      symbolStats: {},
    };

    for (const symbol of symbols) {
      try {
        const analysis = await this.analyzeSymbolGaps(symbol, 5);
        stats.symbolStats[symbol] = analysis;
        stats.analyzed++;
        stats.totalExpectedDays += analysis.targetPeriod.totalTradingDays;
        stats.totalActualDays += analysis.existingData.recordCount;
        stats.totalGapDays += analysis.totalGapDays;
      } catch (error) {
        console.warn(`⚠️ Errore stats per ${symbol}:`, error.message);
      }
    }

    stats.globalCompletionPercentage =
      (stats.totalActualDays / stats.totalExpectedDays) * 100;

    return stats;
  }
}

// Esporta per uso globale
window.DataGapDetector = DataGapDetector;
console.log('📄 data-gap-detector.js caricato');
