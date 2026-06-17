// @ts-check

/**
 * @typedef {object} TursoArg
 * @property {string} type
 * @property {string|number} [value]
 */

/**
 * @typedef {object} TursoResult
 * @property {object[]} rows
 * @property {string[]} cols
 * @property {number} [affectedRows]
 */

/**
 * Minimal Turso client over the libsql HTTP pipeline API.
 */
export class TursoClient {
  /**
   * @param {string} url
   * @param {string} token
   */
  constructor(url, token) {
    if (!url) {
      throw new Error('TURSO_CONFIG.url is required');
    }

    // Turso URLs may be returned as libsql://; the HTTPS API endpoint is the same host with https://
    const httpsUrl = url.replace(/^libsql:\/\//, 'https://');
    if (!httpsUrl.startsWith('https://')) {
      throw new Error('TURSO_CONFIG.url must start with https:// or libsql://');
    }

    this.url = httpsUrl.replace(/\/$/, '') + '/v2/pipeline';
    this.token = token;
  }

  /**
   * @param {RequestInit} requestInit
   * @param {number} [maxAttempts]
   * @returns {Promise<Response>}
   */
  async fetchWithRetry(requestInit, maxAttempts = 3) {
    let lastErr;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fetch(this.url, requestInit);
      } catch (fetchErr) {
        lastErr = fetchErr;
        const isLastAttempt = attempt === maxAttempts;
        if (!isLastAttempt) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 4000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const tips = [
      'Revisa tu conexión a internet.',
      'Si usas una extensión de bloqueo de anuncios o privacidad, prueba desactivarla para este sitio.',
      'Verifica que js/config.js tenga la URL y token correctos de Turso.',
    ];
    throw new Error(`Network error connecting to ${this.url}: ${lastErr.message}. ${tips.join(' ')}`);
  }

  /**
   * @param {unknown} value
   * @returns {TursoArg}
   */
  toTursoArg(value) {
    if (value === null || value === undefined) {
      return { type: 'null' };
    }
    if (Number.isInteger(value)) {
      return { type: 'integer', value: String(value) };
    }
    if (typeof value === 'number') {
      return { type: 'float', value };
    }
    return { type: 'text', value: String(value) };
  }

  /**
   * @param {string} sql
   * @param {unknown[]} [args]
   * @returns {Promise<TursoResult>}
   */
  async execute(sql, args = []) {
    const body = {
      requests: [
        { type: 'execute', stmt: { sql, args: args.map(arg => this.toTursoArg(arg)) } },
        { type: 'close' },
      ],
    };

    const requestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };

    const response = await this.fetchWithRetry(requestInit);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Turso HTTP ${response.status} at ${this.url}: ${text}`);
    }

    const data = await response.json();
    const results = data.results || [];
    const executeResult = results.find(r => r.type === 'ok' && r.response?.type === 'execute');

    if (!executeResult) {
      const errorResult = results.find(r => r.type === 'error');
      if (errorResult) {
        throw new Error(`Turso error: ${errorResult.error?.message || JSON.stringify(errorResult)}`);
      }
      return { rows: [], cols: [] };
    }

    const result = executeResult.response.result;
    const cols = result.cols.map(c => c.name);

    /**
     * @param {unknown} cell
     * @returns {unknown}
     */
    const parseCell = (cell) => {
      if (cell === null || cell === undefined) return null;
      if (typeof cell !== 'object') return cell;
      if (cell.type === 'null') return null;
      if (cell.type === 'integer') return Number(cell.value);
      if (cell.type === 'float') return Number(cell.value);
      return cell.value;
    };

    const rows = result.rows.map(row => {
      const obj = {};
      row.forEach((cell, index) => {
        obj[cols[index]] = parseCell(cell);
      });
      return obj;
    });

    return { rows, cols, affectedRows: result.affected_row_count };
  }
}

if (typeof TURSO_CONFIG === 'undefined') {
  throw new Error('TURSO_CONFIG is not defined. Make sure js/config.js is loaded before js/app.js.');
}

export const turso = new TursoClient(TURSO_CONFIG.url, TURSO_CONFIG.token);
