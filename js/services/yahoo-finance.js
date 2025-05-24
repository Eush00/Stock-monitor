// =============================================
// YAHOO FINANCE SERVICE
// Conversione dalla logica C# esistente
// =============================================

class YahooFinanceService {
  constructor(supabaseClient) {
    this.db = supabaseClient;
    this.corsProxy = CONFIG.apis.corsProxy;
    this.baseUrl = CONFIG.apis.yahoo.baseUrl;
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessing = false;

    // Rate limiting
    this.lastRequest = 0;
    this.minDelay = 2000; // 2 secondi tra richieste
  }

  // ========================================
  // METODO PRINCIPALE: TEST STOCK DATA
  // Conversione del tuo TestStockDataAsync()
  // ========================================
  async testStockDataAsync() {
    const testStocks = CONFIG.testSymbols.stocks;
    const results = [];
    const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 anno fa
    const toDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 giorni fa

    console.log('📈 Avvio test dati azionari Yahoo Finance...');

    for (const symbol of testStocks) {
      const stopwatch = performance.now();
      const result = {
        symbol: symbol,
        dataType: 'Stock Data',
        success: false,
        message: '',
        data: [],
        executionTime: 0,
      };

      try {
        console.log(`🔄 Recupero dati storici per ${symbol}...`);

        // Controlla rate limit
        await this.checkRateLimit('yahoo');

        const historicalData = await this.getHistoricalDataAsync(
          symbol,
          fromDate,
          toDate
        );

        result.data = historicalData;
        result.success = result.data.length > 0;
        result.message = result.success
          ? `✅ Recuperati ${result.data.length} giorni di dati (Ultimo prezzo: $${result.data[0]?.close?.toFixed(2) || 'N/A'})`
          : '❌ Nessun dato trovato';

        // Salva nel database se ci sono dati
        if (result.success && result.data.length > 0) {
          await this.saveStockDataToDatabase(result.data);
        }

        console.log(`${symbol}: ${result.message}`);
      } catch (error) {
        result.success = false;
        result.message = `❌ Errore: ${error.message}`;
        console.error(`Errore per ${symbol}:`, error);
      }

      result.executionTime = performance.now() - stopwatch;
      results.push(result);

      // Log API call
      await this.db.logApiCall(
        'yahoo',
        'chart',
        symbol,
        result.success,
        result.executionTime,
        result.success ? null : result.message
      );

      // Pausa per evitare rate limiting
      await this.delay(3000);
    }

    console.log(
      `✅ Test completato: ${results.filter(r => r.success).length}/${results.length} successi`
    );
    return results;
  }

  // ========================================
  // METODO: GET HISTORICAL DATA
  // Conversione del tuo GetHistoricalDataAsync()
  // ========================================
  async getHistoricalDataAsync(symbol, fromDate, toDate) {
    const from = Math.floor(fromDate.getTime() / 1000);
    const to = Math.floor(toDate.getTime() / 1000);

    console.log(
      `📊 Richiesta dati per ${symbol} dal ${fromDate.toISOString().split('T')[0]} al ${toDate.toISOString().split('T')[0]}`
    );

    // Controlla prima nella cache locale
    const cacheKey = `${symbol}_${from}_${to}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CONFIG.cache.stockDataTtl) {
        console.log(`📂 Dati per ${symbol} trovati in cache`);
        return cached.data;
      }
    }

    // Controlla nel database
    const dbData = await this.db.getStockData(
      symbol,
      fromDate.toISOString().split('T')[0],
      toDate.toISOString().split('T')[0]
    );

    if (dbData.length > 0) {
      console.log(`💾 Dati per ${symbol} trovati nel database`);
      return this.formatDbDataToStockData(dbData);
    }

    // Prova diversi endpoints (come nel tuo C#)
    const endpoints = [
      `${this.baseUrl}/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d&includePrePost=true&events=div%7Csplit`,
      `${this.baseUrl}/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`,
      `${this.baseUrl}/v7/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`,
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Tentativo con endpoint: ${endpoint}`);

        const url = this.corsProxy + encodeURIComponent(endpoint);
        const response = await fetch(url, {
          headers: this.getRequestHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.text();

        // Verifica che sia JSON valido
        if (data.length < 10 || !data.trim().startsWith('{')) {
          console.warn(`⚠️ Risposta non valida per ${symbol}`);
          continue;
        }

        console.log(`✅ Risposta valida ricevuta per ${symbol}`);
        const stockData = this.parseYahooResponse(
          data,
          symbol,
          fromDate,
          toDate
        );

        // Salva in cache
        this.cache.set(cacheKey, {
          data: stockData,
          timestamp: Date.now(),
        });

        return stockData;
      } catch (error) {
        console.warn(`⚠️ Endpoint fallito per ${symbol}:`, error.message);
      }
    }

    throw new Error(`Tutti gli endpoint falliti per ${symbol}`);
  }

  // ========================================
  // METODO: PARSE YAHOO RESPONSE
  // Conversione del tuo ParseYahooResponse()
  // ========================================
  parseYahooResponse(jsonResponse, symbol, fromDate, toDate) {
    try {
      const json = JSON.parse(jsonResponse);
      const chart = json.chart;

      if (!chart?.result?.[0]) {
        const error = json.chart?.error;
        if (error) {
          throw new Error(`Errore Yahoo API: ${JSON.stringify(error)}`);
        }
        throw new Error('Dati non trovati nella risposta API');
      }

      const result = chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators?.quote?.[0];
      const adjClose = result.indicators?.adjclose?.[0]?.adjclose;

      if (!timestamps || !quotes) {
        throw new Error('Struttura dati API non valida');
      }

      // Estrai arrays OHLCV
      const openValues = quotes.open || [];
      const highValues = quotes.high || [];
      const lowValues = quotes.low || [];
      const closeValues = quotes.close || [];
      const volumeValues = quotes.volume || [];
      const adjCloseValues = adjClose || [];

      console.log(
        `📊 Array convertiti per ${symbol}: ${timestamps.length} timestamp, ${openValues.length} prezzi`
      );

      const stockData = [];

      for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000);
        const open = this.parsePrice(openValues[i]);
        const high = this.parsePrice(highValues[i]);
        const low = this.parsePrice(lowValues[i]);
        const close = this.parsePrice(closeValues[i]);
        const adjustedClose = this.parsePrice(adjCloseValues[i]) || close;
        const volume = this.parseVolume(volumeValues[i]);

        // Verifica range di date e validità dati
        const inRange = date >= fromDate && date <= toDate;
        const hasValidData = open > 0 && high > 0 && low > 0 && close > 0;

        if (inRange && hasValidData) {
          stockData.push({
            symbol: symbol,
            date: date.toISOString().split('T')[0],
            open: open,
            high: high,
            low: low,
            close: close,
            adjusted_close: adjustedClose,
            volume: volume,
          });

          if (CONFIG.debug.enabled) {
            console.log(
              `✅ ${date.toISOString().split('T')[0]} O=${open.toFixed(2)} H=${high.toFixed(2)} L=${low.toFixed(2)} C=${close.toFixed(2)} V=${volume.toLocaleString()}`
            );
          }
        } else if (inRange) {
          console.warn(
            `❌ Dati non validi per ${date.toISOString().split('T')[0]}: O=${open} H=${high} L=${low} C=${close}`
          );
        }
      }

      console.log(`✅ Totale dati raccolti per ${symbol}: ${stockData.length}`);
      return stockData.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error(`❌ Errore parsing risposta per ${symbol}:`, error);
      throw error;
    }
  }

  // ========================================
  // METODO: TEST DIVIDENDS
  // Conversione del tuo TestDividendsAsync()
  // ========================================
  async testDividendsAsync() {
    const testStocks = CONFIG.testSymbols.stocks;
    const results = [];
    const fromDate = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000); // 3 anni fa

    console.log('💰 Avvio test dividendi...');

    for (const symbol of testStocks) {
      const stopwatch = performance.now();
      const result = {
        symbol: symbol,
        dataType: 'Dividends',
        success: false,
        message: '',
        data: [],
        executionTime: 0,
      };

      try {
        console.log(`🔄 Recupero dividendi per ${symbol} (ultimi 3 anni)...`);

        await this.checkRateLimit('yahoo');
        result.data = await this.getDividendsAsync(symbol, fromDate);
        result.success = result.data.length > 0;

        if (result.success) {
          const latestDividend = result.data[0];
          result.message = `✅ Trovati ${result.data.length} dividendi (Ultimo: $${latestDividend.amount?.toFixed(4)} il ${latestDividend.ex_date})`;

          // Salva nel database
          await this.saveDividendsToDatabase(result.data);
        } else {
          result.message =
            symbol === 'TSLA'
              ? '📝 Nessun dividendo - Tesla non distribuisce dividendi (normale)'
              : '❌ Nessun dividendo trovato nel periodo';
        }

        console.log(`${symbol}: ${result.message}`);
      } catch (error) {
        result.success = false;
        result.message = `❌ Errore: ${error.message}`;
        console.error(`Errore dividendi per ${symbol}:`, error);
      }

      result.executionTime = performance.now() - stopwatch;
      results.push(result);

      await this.db.logApiCall(
        'yahoo',
        'dividends',
        symbol,
        result.success,
        result.executionTime
      );
      await this.delay(2000);
    }

    return results;
  }

  // ========================================
  // METODO: GET DIVIDENDS
  // ========================================
  async getDividendsAsync(symbol, fromDate) {
    const from = Math.floor(fromDate.getTime() / 1000);
    const to = Math.floor(Date.now() / 1000);

    const url = `${this.baseUrl}/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d&events=div`;
    const proxyUrl = this.corsProxy + encodeURIComponent(url);

    console.log(`📊 URL dividendi per ${symbol}: ${url}`);

    const response = await fetch(proxyUrl, {
      headers: this.getRequestHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    const json = JSON.parse(data);

    const dividends = [];
    const events = json.chart?.result?.[0]?.events?.dividends;

    console.log(
      `📋 Sezione dividendi per ${symbol}:`,
      events ? 'Trovata' : 'NULL'
    );

    if (events) {
      console.log(`✅ Trovata sezione dividendi per ${symbol}, processando...`);

      for (const [timestamp, divData] of Object.entries(events)) {
        const date = new Date(parseInt(timestamp) * 1000);
        const amount = parseFloat(divData.amount);

        console.log(
          `💰 Dividendo ${symbol}: Data=${date.toISOString().split('T')[0]}, Importo=${amount.toFixed(4)}`
        );

        if (amount > 0) {
          dividends.push({
            symbol: symbol,
            ex_date: date.toISOString().split('T')[0],
            payment_date: date.toISOString().split('T')[0],
            amount: amount,
            currency: 'USD',
          });
        }
      }
    } else {
      console.log(`📝 Nessuna sezione dividendi trovata per ${symbol}`);
    }

    return dividends.sort((a, b) => new Date(b.ex_date) - new Date(a.ex_date));
  }

  // ========================================
  // METODO: TEST STOCK SPLITS
  // ========================================
  async testStockSplitsAsync() {
    const testStocks = CONFIG.testSymbols.stocks;
    const results = [];
    const fromDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000); // 5 anni fa

    console.log('✂️ Avvio test frazionamenti azionari...');

    for (const symbol of testStocks) {
      const stopwatch = performance.now();
      const result = {
        symbol: symbol,
        dataType: 'Stock Splits',
        success: false,
        message: '',
        data: [],
        executionTime: 0,
      };

      try {
        console.log(`🔄 Recupero frazionamenti per ${symbol}...`);

        await this.checkRateLimit('yahoo');
        result.data = await this.getStockSplitsAsync(symbol, fromDate);
        result.success = result.data.length > 0;
        result.message = result.success
          ? `✅ Trovati ${result.data.length} frazionamenti`
          : '📝 Nessun frazionamento trovato nel periodo';

        if (result.success) {
          await this.saveStockSplitsToDatabase(result.data);
        }

        console.log(`${symbol}: ${result.message}`);
      } catch (error) {
        result.success = false;
        result.message = `❌ Errore: ${error.message}`;
        console.error(`Errore frazionamenti per ${symbol}:`, error);
      }

      result.executionTime = performance.now() - stopwatch;
      results.push(result);

      await this.db.logApiCall(
        'yahoo',
        'splits',
        symbol,
        result.success,
        result.executionTime
      );
      await this.delay(2000);
    }

    return results;
  }

  // ========================================
  // METODI UTILITY
  // ========================================

  async getStockSplitsAsync(symbol, fromDate) {
    const from = Math.floor(fromDate.getTime() / 1000);
    const to = Math.floor(Date.now() / 1000);

    const url = `${this.baseUrl}/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d&events=split`;
    const proxyUrl = this.corsProxy + encodeURIComponent(url);

    const response = await fetch(proxyUrl, {
      headers: this.getRequestHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    const json = JSON.parse(data);

    const splits = [];
    const events = json.chart?.result?.[0]?.events?.splits;

    if (events) {
      for (const [timestamp, splitData] of Object.entries(events)) {
        const date = new Date(parseInt(timestamp) * 1000);
        const numerator = parseFloat(splitData.numerator);
        const denominator = parseFloat(splitData.denominator);

        if (numerator > 0 && denominator > 0) {
          splits.push({
            symbol: symbol,
            split_date: date.toISOString().split('T')[0],
            split_ratio: `${numerator}:${denominator}`,
            split_factor: numerator / denominator,
          });
        }
      }
    }

    return splits.sort(
      (a, b) => new Date(b.split_date) - new Date(a.split_date)
    );
  }

  // Rate limiting
  async checkRateLimit(provider) {
    const canProceed = await this.db.checkRateLimit(provider);
    if (!canProceed) {
      throw new Error(`Rate limit raggiunto per ${provider}`);
    }

    // Delay minimo tra richieste
    const timeSinceLastRequest = Date.now() - this.lastRequest;
    if (timeSinceLastRequest < this.minDelay) {
      await this.delay(this.minDelay - timeSinceLastRequest);
    }
    this.lastRequest = Date.now();
  }

  // Headers per richieste
  getRequestHeaders() {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept:
        'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      DNT: '1',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    };
  }

  // Parsing utility
  parsePrice(value) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Math.round(parseFloat(value) * 10000) / 10000; // 4 decimali
  }

  parseVolume(value) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return parseInt(value) || 0;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Salvataggio database
  async saveStockDataToDatabase(stockData) {
    if (stockData.length === 0) return;

    try {
      await this.db.insertStockData(stockData);
      console.log(
        `💾 ${stockData.length} record stock data salvati nel database`
      );
    } catch (error) {
      console.error('❌ Errore salvataggio stock data:', error);
    }
  }

  async saveDividendsToDatabase(dividends) {
    if (dividends.length === 0) return;

    try {
      for (const dividend of dividends) {
        const { error } = await this.db.client
          .from('dividends')
          .upsert(dividend, { onConflict: 'symbol,ex_date' });

        if (error) throw error;
      }
      console.log(`💾 ${dividends.length} dividendi salvati nel database`);
    } catch (error) {
      console.error('❌ Errore salvataggio dividendi:', error);
    }
  }

  async saveStockSplitsToDatabase(splits) {
    if (splits.length === 0) return;

    try {
      for (const split of splits) {
        const { error } = await this.db.client
          .from('stock_splits')
          .upsert(split, { onConflict: 'symbol,split_date' });

        if (error) throw error;
      }
      console.log(`💾 ${splits.length} frazionamenti salvati nel database`);
    } catch (error) {
      console.error('❌ Errore salvataggio frazionamenti:', error);
    }
  }

  formatDbDataToStockData(dbData) {
    return dbData.map(row => ({
      symbol: row.symbol,
      date: row.date,
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close),
      adjusted_close: parseFloat(row.adjusted_close),
      volume: parseInt(row.volume),
    }));
  }

  // Metodo principale per test completo (come il tuo RunAllTestsAsync)
  async runAllTestsAsync() {
    console.log('🚀 === INIZIO TEST COMPLETO YAHOO FINANCE ===');
    const totalStopwatch = performance.now();

    const testResults = {
      stockResults: [],
      dividendResults: [],
      splitResults: [],
      totalSuccessful: 0,
      totalFailed: 0,
      totalTests: 0,
      totalExecutionTime: 0,
    };

    try {
      // Test Stock Data
      console.log('📈 --- TEST DATI AZIONARI ---');
      testResults.stockResults = await this.testStockDataAsync();

      // Test Dividendi
      console.log('💰 --- TEST DIVIDENDI ---');
      testResults.dividendResults = await this.testDividendsAsync();

      // Test Stock Splits
      console.log('✂️ --- TEST FRAZIONAMENTI ---');
      testResults.splitResults = await this.testStockSplitsAsync();

      // Calcola statistiche
      const allResults = [
        ...testResults.stockResults,
        ...testResults.dividendResults,
        ...testResults.splitResults,
      ];

      testResults.totalSuccessful = allResults.filter(r => r.success).length;
      testResults.totalFailed = allResults.filter(r => !r.success).length;
      testResults.totalTests = allResults.length;
      testResults.totalExecutionTime = performance.now() - totalStopwatch;

      console.log(
        `🎉 === FINE TEST: ${testResults.totalSuccessful}/${testResults.totalTests} successi in ${(testResults.totalExecutionTime / 1000).toFixed(2)}s ===`
      );
    } catch (error) {
      console.error('❌ Errore durante test completo:', error);
    }

    return testResults;
  }
}

// Esporta per uso globale
window.YahooFinanceService = YahooFinanceService;
