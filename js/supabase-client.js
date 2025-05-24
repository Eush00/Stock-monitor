// =============================================
// SUPABASE CLIENT CONFIGURATION
// =============================================

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 3;
    }

    // Inizializza connessione a Supabase
    async initialize() {
        try {
            console.log('🔄 Inizializzazione client Supabase...');
            
            // Valida configurazione
            if (!validateConfig()) {
                throw new Error('Configurazione non valida');
            }
            
            // Crea client Supabase
            this.client = supabase.createClient(
                CONFIG.supabase.url,
                CONFIG.supabase.anonKey
            );
            
            // Test connessione
            await this.testConnection();
            
            this.isConnected = true;
            console.log('✅ Client Supabase inizializzato con successo');
            
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione Supabase:', error);
            this.isConnected = false;
            throw error;
        }
    }

    // Test di connessione
    async testConnection() {
        try {
            console.log('🔄 Test connessione database...');
            
            // Query semplice per testare connessione
            const { data, error } = await this.client
                .from('company_fundamentals')
                .select('count')
                .limit(1);
            
            if (error) {
                throw error;
            }
            
            console.log('✅ Connessione database verificata');
            return true;
        } catch (error) {
            console.error('❌ Test connessione fallito:', error);
            throw error;
        }
    }

    // Ottieni statistiche database
    async getDatabaseStats() {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            console.log('📊 Recupero statistiche database...');
            
            // Utilizza la funzione SQL che abbiamo creato
            const { data, error } = await this.client
                .rpc('get_database_stats');
            
            if (error) {
                throw error;
            }
            
            console.log('✅ Statistiche recuperate:', data);
            return data;
        } catch (error) {
            console.error('❌ Errore recupero statistiche:', error);
            // Ritorna statistiche vuote in caso di errore
            return {
                stock_data_count: 0,
                companies_count: 0,
                dividends_count: 0,
                splits_count: 0,
                volatility_count: 0,
                rates_count: 0,
                api_calls_today: 0,
                database_size_mb: 0,
                last_stock_update: null,
                last_fundamentals_update: null
            };
        }
    }

    // Inserisci dati stock
    async insertStockData(stockData) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            console.log(`💾 Inserimento ${stockData.length} record stock data...`);
            
            const { data, error } = await this.client
                .from('stock_data')
                .upsert(stockData, { 
                    onConflict: 'symbol,date',
                    ignoreDuplicates: false 
                });
            
            if (error) {
                throw error;
            }
            
            console.log(`✅ ${stockData.length} record inseriti con successo`);
            return data;
        } catch (error) {
            console.error('❌ Errore inserimento stock data:', error);
            throw error;
        }
    }

    // Recupera dati stock
    async getStockData(symbol, fromDate = null, toDate = null, limit = 100) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            console.log(`📈 Recupero dati per ${symbol}...`);
            
            let query = this.client
                .from('stock_data')
                .select('*')
                .eq('symbol', symbol)
                .order('date', { ascending: false })
                .limit(limit);
            
            if (fromDate && toDate) {
                query = query
                    .gte('date', fromDate)
                    .lte('date', toDate);
            }
            
            const { data, error } = await query;
            
            if (error) {
                throw error;
            }
            
            console.log(`✅ Recuperati ${data.length} record per ${symbol}`);
            return data;
        } catch (error) {
            console.error(`❌ Errore recupero dati per ${symbol}:`, error);
            return [];
        }
    }

    // Inserisci/aggiorna company fundamentals
    async upsertFundamentals(fundamentals) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            console.log(`🏢 Aggiornamento fundamentals per ${fundamentals.symbol}...`);
            
            const { data, error } = await this.client
                .from('company_fundamentals')
                .upsert(fundamentals, { onConflict: 'symbol' });
            
            if (error) {
                throw error;
            }
            
            console.log(`✅ Fundamentals aggiornati per ${fundamentals.symbol}`);
            return data;
        } catch (error) {
            console.error(`❌ Errore aggiornamento fundamentals:`, error);
            throw error;
        }
    }

    // Log chiamata API per rate limiting
    async logApiCall(provider, endpoint, symbol, success, executionTime, errorMessage = null) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            const logData = {
                provider,
                endpoint,
                symbol,
                success,
                execution_time: executionTime,
                error_message: errorMessage,
                reset_time: new Date(Date.now() + CONFIG.rateLimits[provider]?.windowMs || 3600000)
            };
            
            const { error } = await this.client
                .from('api_calls')
                .insert(logData);
            
            if (error) {
                console.warn('⚠️ Errore logging API call:', error);
            }
        } catch (error) {
            console.warn('⚠️ Errore logging API call:', error);
        }
    }

    // Verifica rate limit
    async checkRateLimit(provider) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }

            const windowStart = new Date(Date.now() - (CONFIG.rateLimits[provider]?.windowMs || 3600000));
            
            const { data, error } = await this.client
                .from('api_calls')
                .select('*')
                .eq('provider', provider)
                .gte('created_at', windowStart.toISOString());
            
            if (error) {
                console.warn('⚠️ Errore controllo rate limit:', error);
                return true; // Permetti in caso di errore
            }
            
            const callCount = data.length;
            const maxCalls = CONFIG.rateLimits[provider]?.maxCalls || 100;
            
            console.log(`🔍 Rate limit ${provider}: ${callCount}/${maxCalls}`);
            
            return callCount < maxCalls;
        } catch (error) {
            console.warn('⚠️ Errore controllo rate limit:', error);
            return true; // Permetti in caso di errore
        }
    }

    // Ottieni connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            client: this.client !== null,
            attempts: this.connectionAttempts
        };
    }
}

// Istanza globale
const supabaseClient = new SupabaseClient();
