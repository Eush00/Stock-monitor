// =============================================
// RATE LIMIT MANAGER - Gestione intelligente limiti API
// =============================================

class RateLimitManager {
  constructor() {
    this.limits = {
      yahoo: {
        maxCallsPerHour: 50, // RIDOTTO da 100 a 50 per sicurezza
        maxCallsPerDay: 1500, // RIDOTTO da 2000 a 1500 per sicurezza
        calls: [],
        lastReset: Date.now(),
        minDelayBetweenCalls: 2000, // AGGIUNTO: Minimo 2s tra chiamate
      },
    };

    this.lastCallTime = {};
    console.log('⚡ RateLimitManager: Inizializzato (modalità SICURA)');
  }

  canMakeRequest(provider) {
    this.cleanOldCalls(provider);
    const limit = this.limits[provider];

    // Controllo delay minimo tra chiamate
    const now = Date.now();
    const lastCall = this.lastCallTime[provider] || 0;
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall < limit.minDelayBetweenCalls) {
      return false; // Troppo presto per la prossima chiamata
    }

    const callsInLastHour = this.getCallsInWindow(provider, 3600000);
    const callsInLastDay = this.getCallsInWindow(provider, 86400000);

    const canCall =
      callsInLastHour < limit.maxCallsPerHour &&
      callsInLastDay < limit.maxCallsPerDay;

    console.log(
      `⚡ Rate limit check ${provider}: ${callsInLastHour}/${limit.maxCallsPerHour} ora, ${callsInLastDay}/${limit.maxCallsPerDay} giorno - Can call: ${canCall}`
    );

    return canCall;
  }

  recordApiCall(provider) {
    if (!this.limits[provider]) return;

    const now = Date.now();
    this.limits[provider].calls.push(now);
    this.lastCallTime[provider] = now;
    this.cleanOldCalls(provider);

    console.log(`⚡ Chiamata API registrata per ${provider}`);
  }

  getWaitTime(provider) {
    const limit = this.limits[provider];
    const now = Date.now();

    // Controllo delay minimo
    const lastCall = this.lastCallTime[provider] || 0;
    const minWait = lastCall + limit.minDelayBetweenCalls - now;

    // Controllo limite orario
    const oldestCallInHour = now - 3600000;
    const callsInHour = limit.calls.filter(time => time > oldestCallInHour);
    const hourlyWait =
      callsInHour.length >= limit.maxCallsPerHour
        ? callsInHour[0] + 3600000 - now
        : 0;

    return Math.max(minWait, hourlyWait, 0);
  }

  // Resto dei metodi uguale...
  cleanOldCalls(provider) {
    const limit = this.limits[provider];
    const oneDayAgo = Date.now() - 86400000;
    limit.calls = limit.calls.filter(time => time > oneDayAgo);
  }

  getCallsInWindow(provider, windowMs) {
    const limit = this.limits[provider];
    const windowStart = Date.now() - windowMs;
    return limit.calls.filter(time => time > windowStart).length;
  }

  getStatus() {
    const status = {};

    for (const [provider, limit] of Object.entries(this.limits)) {
      const now = Date.now();
      const lastCall = this.lastCallTime[provider] || 0;
      const timeSinceLastCall = now - lastCall;

      status[provider] = {
        callsLastHour: this.getCallsInWindow(provider, 3600000),
        callsLastDay: this.getCallsInWindow(provider, 86400000),
        maxHour: limit.maxCallsPerHour,
        maxDay: limit.maxCallsPerDay,
        canMakeRequest: this.canMakeRequest(provider),
        waitTime: this.getWaitTime(provider),
        timeSinceLastCall: timeSinceLastCall,
        minDelay: limit.minDelayBetweenCalls,
      };
    }

    return status;
  }
}

// Esporta per uso globale
window.RateLimitManager = RateLimitManager;
console.log('📄 rate-limit-manager.js caricato');
