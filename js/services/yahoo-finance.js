// =============================================
// YAHOO FINANCE SERVICE - CONVERSIONE COMPLETA DA C#
// Con salvataggio database integrato
// =============================================

class YahooFinanceService {
  constructor(supabaseClient) {
    this.db = supabaseClient;
    this.httpClient = null; // Simuliamo HttpClient

    // ESATTA copia delle liste dal C#
    this.testStocks = [
      'AAPL', // Apple - ha dividendi regolari
      'MSFT', // Microsoft - ha dividendi regolari
      'KO', // Coca-Cola - famosa per dividendi costanti
      'JNJ', // Johnson & Johnson - dividendi da decenni
      'TSLA', // Tesla - NO dividendi (per confronto)
    ];

    this.testIndices = {
      '^GSPC': 'S&P 500',
      '^IXIC': 'NASDAQ',
      '^DJI': 'Dow Jones',
      '^FTSE': 'FTSE 100',
      'FTSEMIB.MI': 'FTSE MIB',
      '^STOXX50E': 'Euro Stoxx 50',
    };

    console.log('🚀 YahooFinanceService: Inizializzato (CONVERSIONE COMPLETA)');
    this.configureHttpClient();
  }

  // ========================================
  // ConfigureHttpClient() - CONVERSIONE DIRETTA
  // ========================================
  configureHttpClient() {
    // Nel browser non possiamo impostare tutti gli headers come in C#
    // ma manteniamo la stessa logica
    console.log('🔧 Configurazione HttpClient (simulated)');

    this.defaultHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept:
        'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      DNT: '1',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };

    this.timeout = 30000; // 30 secondi come nel C#
  }

  // ========================================
  // RunAllTestsAsync() - CONVERSIONE DIRETTA
  // ========================================
  async runAllTestsAsync() {
    console.log('=== INIZIO TEST COMPLETO YAHOO FINANCE ===');
    const totalStopwatch = performance.now();

    const viewModel = {
      stockResults: [],
      dividendResults: [],
      splitResults: [],
      indexResults: [],
      totalSuccessful: 0,
      totalFailed: 0,
      totalTests: 0,
      totalExecutionTime: 0,
    };

    // Test Stock Data
    console.log('--- TEST DATI AZIONARI ---');
    viewModel.stockResults = await this.testStockDataAsync();

    // Test Dividendi
    console.log('--- TEST DIVIDENDI ---');
    viewModel.dividendResults = await this.testDividendsAsync();

    // Test Stock Splits
    console.log('--- TEST FRAZIONAMENTI ---');
    viewModel.splitResults = await this.testStockSplitsAsync();

    // Test Indici
    console.log('--- TEST INDICI ---');
    viewModel.indexResults = await this.testIndicesAsync();

    const totalExecutionTime = performance.now() - totalStopwatch;
    viewModel.totalExecutionTime = totalExecutionTime;

    // Calcola statistiche - STESSA LOGICA C#
    const allResults = [];
    allResults.push(...viewModel.stockResults.map(r => r.success));
    allResults.push(...viewModel.dividendResults.map(r => r.success));
    allResults.push(...viewModel.splitResults.map(r => r.success));
    allResults.push(...viewModel.indexResults.map(r => r.success));

    viewModel.totalSuccessful = allResults.filter(r => r).length;
    viewModel.totalFailed = allResults.filter(r => !r).length;
    viewModel.totalTests = allResults.length;

    console.log(
      `=== FINE TEST: ${viewModel.totalSuccessful}/${viewModel.totalTests} successi in ${(totalExecutionTime / 1000).toFixed(2)}s ===`
    );

    return viewModel;
  }

  // ========================================
  // TestStockDataAsync() - CONVERSIONE DIRETTA + SALVATAGGIO
  // ========================================
  async testStockDataAsync() {
    const results = [];

    // STESSE DATE DEL C#
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 1); // DateTime.Now.AddYears(-1)

    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 30); // DateTime.Now.AddDays(-30)

    console.log(
      `📅 Date dal C#: ${fromDate.toISOString().split('T')[0]} → ${toDate.toISOString().split('T')[0]}`
    );

    for (const symbol of this.testStocks) {
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
        console.log(`Recupero dati storici per ${symbol}...`);

        const historicalData = await this.getHistoricalDataAsync(
          symbol,
          fromDate,
          toDate
        );

        result.data = historicalData;
        result.success = result.data.length > 0; // .Any() in C#
        result.message = result.success
          ? `Recuperati ${result.data.length} giorni di dati (Ultimo prezzo: $${result.data[0].close.toFixed(2)})`
          : 'Nessun dato trovato';

        console.log(`${symbol}: ${result.message}`);

        // 🔥 SALVATAGGIO NEL DATABASE
        if (result.success && result.data.length > 0) {
          console.log(
            `💾 Salvataggio ${result.data.length} record per ${symbol}...`
          );
          await this.saveStockDataToDatabase(result.data);
        }
      } catch (ex) {
        result.success = false;
        result.message = `Errore: ${ex.message}`;
        console.error(`Errore recupero dati per ${symbol}`, ex);
      }

      result.executionTime = performance.now() - stopwatch;
      results.push(result);

      // Pausa per evitare rate limiting - STESSA DEL C#
      await this.delay(3000);
    }

    return results;
  }

  // ========================================
  // GetHistoricalDataAsync() - CONVERSIONE DIRETTA
  // ========================================
  async getHistoricalDataAsync(symbol, fromDate, toDate) {
    // STESSA CONVERSIONE DEL C#
    const from = Math.floor(fromDate.getTime() / 1000); // ToUnixTimeSeconds()
    const to = Math.floor(toDate.getTime() / 1000);

    console.log(
      `Richiesta dati per ${symbol} dal ${fromDate.toISOString().split('T')[0]} al ${toDate.toISOString().split('T')[0]}`
    );

    // Prova diversi endpoint in ordine di preferenza - STESSI DEL C#
    const endpoints = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d&includePrePost=true&events=div%7Csplit`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`,
      `https://query1.finance.yahoo.com/v7/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`,
    ];

    for (const url of endpoints) {
      try {
        console.log(`Tentativo con URL: ${url}`);

        // Simuliamo HttpClient.GetStringAsync() - Il browser ha limitazioni CORS
        const response = await this.httpClientGetStringAsync(url);

        // Verifica che la risposta sia JSON valido - STESSA LOGICA C#
        if (response.length < 10 || !response.trimStart().startsWith('{')) {
          console.warn(`Risposta non valida per ${symbol}`);
          continue;
        }

        console.log(`Risposta valida ricevuta per ${symbol}`);

        return this.parseYahooResponse(response, symbol, fromDate, toDate);
      } catch (ex) {
        console.warn(`Endpoint ${url} fallito per ${symbol}: ${ex.message}`);
      }
    }

    throw new Error(`Tutti gli endpoint falliti per ${symbol}`);
  }

  // ========================================
  // ParseYahooResponse() - CONVERSIONE DIRETTA
  // ========================================
  parseYahooResponse(jsonResponse, symbol, fromDate, toDate) {
    const json = JSON.parse(jsonResponse);

    const chart = json.chart;
    if (!chart || !chart.result || !chart.result[0]) {
      const error = json.chart?.error;
      if (error != null) {
        throw new Error(`Errore Yahoo API: ${error}`);
      }
      throw new Error('Dati non trovati nella risposta API');
    }

    const result = chart.result[0];
    const timestamps = result.timestamp; // ToObject<long[]>() in C#
    const quotes = result.indicators?.quote?.[0];
    const adjClose = result.indicators?.adjclose?.[0]?.adjclose;

    if (timestamps == null || quotes == null) {
      throw new Error('Struttura dati API non valida');
    }

    // CORREZIONE: Converti gli array direttamente - STESSA LOGICA C#
    const openValues = quotes.open;
    const highValues = quotes.high;
    const lowValues = quotes.low;
    const closeValues = quotes.close;
    const volumeValues = quotes.volume;
    const adjCloseValues = adjClose;

    if (
      openValues == null ||
      highValues == null ||
      lowValues == null ||
      closeValues == null ||
      volumeValues == null
    ) {
      throw new Error('Errore conversione array OHLCV');
    }

    console.log(
      `Array convertiti per ${symbol}: Open[0]=${openValues[0]}, High[0]=${highValues[0]}, Close[0]=${closeValues[0]}`
    );

    const stockData = [];

    for (let i = 0; i < timestamps.length; i++) {
      const date = new Date(timestamps[i] * 1000); // FromUnixTimeSeconds().DateTime in C#

      const open = openValues[i];
      const high = highValues[i];
      const low = lowValues[i];
      const close = closeValues[i];
      const adjustedClose = adjCloseValues?.[i] ?? close;
      const volume = volumeValues[i];

      // Verifica range di date e validità dati - STESSA LOGICA C#
      const inRange = date >= fromDate && date <= toDate;
      const hasValidData = open > 0 && high > 0 && low > 0 && close > 0;

      if (inRange && hasValidData) {
        stockData.push({
          symbol: symbol,
          date: date,
          open: open,
          high: high,
          low: low,
          close: close,
          adjustedClose: adjustedClose,
          volume: volume,
        });

        console.log(
          `✅ Aggiunto: ${date.toISOString().split('T')[0]} O=${open.toFixed(2)} H=${high.toFixed(2)} L=${low.toFixed(2)} C=${close.toFixed(2)} AC=${adjustedClose.toFixed(2)} V=${volume.toLocaleString()}`
        );
      } else if (inRange) {
        console.warn(
          `❌ Dati non validi per ${date.toISOString().split('T')[0]}: O=${open} H=${high} L=${low} C=${close}`
        );
      }
    }

    console.log(`✅ Totale dati raccolti per ${symbol}: ${stockData.length}`);
    return stockData.sort((a, b) => new Date(b.date) - new Date(a.date)); // OrderByDescending(s => s.Date) in C#
  }

  // ========================================
  // TestDividendsAsync() - CONVERSIONE DIRETTA + SALVATAGGIO
  // ========================================
  async testDividendsAsync() {
    const results = [];
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 3); // AddYears(-3) in C#

    for (const symbol of this.testStocks) {
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
        console.log(`Recupero dividendi per ${symbol} (ultimi 3 anni)...`);

        result.data = await this.getDividendsAsync(symbol, fromDate);
        result.success = result.data.length > 0; // .Any() in C#

        if (result.success) {
          const latestDividend = result.data[0]; // .First() in C#
          result.message = `Trovati ${result.data.length} dividendi (Ultimo: $${latestDividend.dividendAmount.toFixed(4)} il ${latestDividend.exDate.toISOString().split('T')[0]})`;

          // 🔥 SALVATAGGIO DIVIDENDI NEL DATABASE
          console.log(
            `💾 Salvataggio ${result.data.length} dividendi per ${symbol}...`
          );
          await this.saveDividendsToDatabase(result.data);
        } else {
          result.message =
            symbol == 'TSLA'
              ? 'Nessun dividendo - Tesla non distribuisce dividendi (normale)'
              : 'Nessun dividendo trovato nel periodo';
        }

        console.log(`${symbol}: ${result.message}`);
      } catch (ex) {
        result.success = false;
        result.message = `Errore: ${ex.message}`;
        console.error(`Errore recupero dividendi per ${symbol}`, ex);
      }

      result.executionTime = performance.now() - stopwatch;
      results.push(result);

      await this.delay(2000);
    }

    return results;
  }

  // ========================================
  // GetDividendsAsync() - CONVERSIONE DIRETTA
  // ========================================
  async getDividendsAsync(symbol, fromDate) {
    const from = Math.floor(fromDate.getTime() / 1000); // ToUnixTimeSeconds() in C#
    const to = Math.floor(Date.now() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d&events=div`;

    console.log(`URL dividendi per ${symbol}: ${url}`);

    const response = await this.httpClientGetStringAsync(url);
    const json = JSON.parse(response);

    const dividends = [];
    const events = json.chart?.result?.[0]?.events?.dividends;

    console.log(
      `Sezione dividendi per ${symbol}: ${events?.toString() ?? 'NULL'}`
    );

    if (events != null) {
      console.log(`Trovata sezione dividendi per ${symbol}, processando...`);

      // foreach (var prop in ((JObject)events).Properties()) in C#
      for (const [timestampStr, div] of Object.entries(events)) {
        const timestamp = parseInt(timestampStr);
        const date = new Date(timestamp * 1000); // FromUnixTimeSeconds().DateTime in C#

        // CORREZIONE: Parsing diretto invece di SafeParseDecimal - COME NEL C#
        const amount = div.amount;

        console.log(
          `Dividendo ${symbol}: Data=${date.toISOString().split('T')[0]}, Importo=${amount.toFixed(4)}`
        );

        if (amount > 0) {
          dividends.push({
            symbol: symbol,
            exDate: date,
            paymentDate: date,
            dividendAmount: amount,
          });
        }
      }
    } else {
      console.log(
        `Nessuna sezione dividendi trovata per ${symbol} - questo è normale se l'azione non distribuisce dividendi`
      );
    }

    return dividends.sort((a, b) => new Date(b.exDate) - new Date(a.exDate)); // OrderByDescending(d => d.ExDate) in C#
  }

  // ========================================
  // TestStockSplitsAsync() - CONVERSIONE DIRETTA
  // ========================================
  async testStockSplitsAsync() {
    const results = [];
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 5); // AddYears(-5) in C#

    for (const symbol of this.testStocks) {
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
        console.log(`Recupero frazionamenti per ${symbol}...`);

        result.data = await this.getStockSplitsAsync(symbol, fromDate);
        result.success = result.data.length > 0; // .Any() in C#
        result.message = result.success
          ? `Trovati ${result.data.length} frazionamenti`
          : 'Nessun frazionamento trovato nel periodo';

        console.log(`${symbol}: ${result.message}`);

        // 🔥 SALVATAGGIO SPLITS NEL DATABASE
        if (result.success && result.data.length > 0) {
          console.log(
            `💾 Salvataggio ${result.data.length} frazionamenti per ${symbol}...`
          );
          await this.saveStockSplitsToDatabase(result.data);
        }
      } catch (ex) {
        result.success = false;
        result.message = `Errore: ${ex.message}`;
        console.error(`Errore recupero frazionamenti per ${symbol}`, ex);
      }

      result.executionTime = performance.now() - stopwatch;
      results.push(result);

      await this.delay(2000);
    }

    return results;
  }

  // ========================================
  // GetStockSplitsAsync() - CONVERSIONE DIRETTA
  // ========================================
  async getStockSplitsAsync(symbol, fromDate) {
    const from = Math.floor(fromDate.getTime() / 1000); // ToUnixTimeSeconds() in C#
    const to = Math.floor(Date.now() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d&events=split`;

    const response = await this.httpClientGetStringAsync(url);
    const json = JSON.parse(response);

    const splits = [];
    const events = json.chart?.result?.[0]?.events?.splits;

    if (events != null) {
      for (const [timestampStr, split] of Object.entries(events)) {
        const timestamp = parseInt(timestampStr);
        const date = new Date(timestamp * 1000);
        const numerator = this.safeParseDecimal(split.numerator);
        const denominator = this.safeParseDecimal(split.denominator);

        if (numerator > 0 && denominator > 0) {
          splits.push({
            symbol: symbol,
            splitDate: date,
            splitRatio: `${numerator}:${denominator}`,
            splitFactor: numerator / denominator,
          });
        }
      }
    }

    return splits.sort((a, b) => new Date(b.splitDate) - new Date(a.splitDate)); // OrderByDescending(s => s.SplitDate) in C#
  }

  // ========================================
  // TestIndicesAsync() - CONVERSIONE DIRETTA
  // ========================================
  async testIndicesAsync() {
    const results = [];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30); // AddDays(-30) in C#
    const toDate = new Date();

    // Take(3) in C# = slice(0, 3)
    const indicesToTest = Object.entries(this.testIndices).slice(0, 3);

    for (const [indexSymbol, indexName] of indicesToTest) {
      const stopwatch = performance.now();
      const result = {
        symbol: indexSymbol,
        dataType: 'Index Data',
        success: false,
        message: '',
        data: [],
        executionTime: 0,
      };

      try {
        console.log(`Recupero dati per indice ${indexName}...`);

        const historicalData = await this.getHistoricalDataAsync(
          indexSymbol,
          fromDate,
          toDate
        );

        // Converti in IndexData format come nel C#
        result.data = historicalData.map(h => ({
          symbol: indexSymbol,
          name: indexName,
          date: h.date,
          open: h.open,
          high: h.high,
          low: h.low,
          close: h.close,
          volume: h.volume,
        }));

        result.success = result.data.length > 0; // .Any() in C#
        result.message = result.success
          ? `Recuperati ${result.data.length} giorni per ${indexName} (Ultimo: ${result.data[0].close.toFixed(2)})`
          : 'Nessun dato trovato';

        console.log(`${indexSymbol}: ${result.message}`);
      } catch (ex) {
        result.success = false;
        result.message = `Errore: ${ex.message}`;
        console.error(`Errore recupero dati per indice ${indexSymbol}`, ex);
      }

      result.executionTime = performance.now() - stopwatch;
      results.push(result);

      await this.delay(3000);
    }

    return results;
  }

  // ========================================
  // METODI SALVATAGGIO DATABASE
  // ========================================

  async saveStockDataToDatabase(stockData) {
    if (!stockData || stockData.length === 0) return;

    try {
      console.log(
        `💾 Inizio salvataggio ${stockData.length} record stock data...`
      );

      // Converti il formato per il database
      const dbRecords = stockData.map(record => ({
        symbol: record.symbol,
        date: record.date.toISOString().split('T')[0], // Formato YYYY-MM-DD
        open: record.open,
        high: record.high,
        low: record.low,
        close: record.close,
        adjusted_close: record.adjustedClose,
        volume: record.volume,
      }));

      // Salva in batch per evitare timeout
      const batchSize = 50;
      let savedCount = 0;

      for (let i = 0; i < dbRecords.length; i += batchSize) {
        const batch = dbRecords.slice(i, i + batchSize);
        console.log(
          `  📦 Salvataggio batch ${Math.floor(i / batchSize) + 1}: ${batch.length} record`
        );

        await this.db.insertStockData(batch);
        savedCount += batch.length;

        // Piccola pausa tra batch
        if (i + batchSize < dbRecords.length) {
          await this.delay(100);
        }
      }

      console.log(
        `✅ Stock data salvati: ${savedCount}/${stockData.length} record`
      );
    } catch (error) {
      console.error('❌ Errore salvataggio stock data:', error);
      console.error('💡 Dettagli errore:', error.message);

      // Se è problema RLS, mostra suggerimento
      if (error.message && error.message.includes('row-level security')) {
        console.error('🔒 PROBLEMA RLS: Vai su Supabase SQL Editor ed esegui:');
        console.error('   ALTER TABLE stock_data DISABLE ROW LEVEL SECURITY;');
      }
    }
  }

  async saveDividendsToDatabase(dividends) {
    if (!dividends || dividends.length === 0) return;

    try {
      console.log(`💾 Inizio salvataggio ${dividends.length} dividendi...`);

      // Converti il formato per il database
      const dbRecords = dividends.map(dividend => ({
        symbol: dividend.symbol,
        ex_date: dividend.exDate.toISOString().split('T')[0],
        payment_date: dividend.paymentDate.toISOString().split('T')[0],
        amount: dividend.dividendAmount,
        currency: 'USD',
      }));

      // Salva uno per uno per gestire conflicts
      let savedCount = 0;
      for (const record of dbRecords) {
        try {
          const { error } = await this.db.client
            .from('dividends')
            .upsert(record, { onConflict: 'symbol,ex_date' });

          if (error) {
            console.warn(
              `⚠️ Errore inserimento dividendo ${record.symbol} ${record.ex_date}:`,
              error.message
            );
          } else {
            savedCount++;
          }
        } catch (err) {
          console.warn(`⚠️ Errore dividendo ${record.symbol}:`, err.message);
        }
      }

      console.log(
        `✅ Dividendi salvati: ${savedCount}/${dividends.length} record`
      );
    } catch (error) {
      console.error('❌ Errore salvataggio dividendi:', error);
      console.error('💡 Dettagli errore:', error.message);
    }
  }

  async saveStockSplitsToDatabase(splits) {
    if (!splits || splits.length === 0) return;

    try {
      console.log(`💾 Inizio salvataggio ${splits.length} frazionamenti...`);

      // Converti il formato per il database
      const dbRecords = splits.map(split => ({
        symbol: split.symbol,
        split_date: split.splitDate.toISOString().split('T')[0],
        split_ratio: split.splitRatio,
        split_factor: split.splitFactor,
      }));

      // Salva uno per uno per gestire conflicts
      let savedCount = 0;
      for (const record of dbRecords) {
        try {
          const { error } = await this.db.client
            .from('stock_splits')
            .upsert(record, { onConflict: 'symbol,split_date' });

          if (error) {
            console.warn(
              `⚠️ Errore inserimento split ${record.symbol} ${record.split_date}:`,
              error.message
            );
          } else {
            savedCount++;
          }
        } catch (err) {
          console.warn(`⚠️ Errore split ${record.symbol}:`, err.message);
        }
      }

      console.log(
        `✅ Frazionamenti salvati: ${savedCount}/${splits.length} record`
      );
    } catch (error) {
      console.error('❌ Errore salvataggio frazionamenti:', error);
      console.error('💡 Dettagli errore:', error.message);
    }
  }

  // ========================================
  // METODI UTILITY - CONVERSIONI DIRETTE
  // ========================================

  // Simulazione di HttpClient.GetStringAsync() con gestione CORS
  async httpClientGetStringAsync(url) {
    // Nel browser dobbiamo aggirare CORS, ma manteniamo la stessa logica
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const proxyUrl = corsProxy + encodeURIComponent(url);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // SafeParseDecimal equivalente dal C#
  safeParseDecimal(token) {
    if (token == null) return 0;
    if (typeof token === 'number') return token;
    const result = parseFloat(token);
    return isNaN(result) ? 0 : result;
  }

  safeParseLong(token) {
    if (token == null) return 0;
    const result = parseInt(token);
    return isNaN(result) ? 0 : result;
  }
}

// Esporta per uso globale
window.YahooFinanceService = YahooFinanceService;
console.log('📄 yahoo-finance.js CONVERSIONE COMPLETA DA C# caricato');
