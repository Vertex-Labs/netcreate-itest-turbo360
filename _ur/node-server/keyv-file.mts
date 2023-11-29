/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  KeyV-File 
  https://github.com/zaaack/keyv-file/

  modified by Sri to add missing iterator support
  added additional formatting to make it easier to scan
  
  MIT License

  Copyright (c) 2017 Zack Young

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import * as os from 'os';
import * as fs from 'fs-extra';
import Debug from 'debug';

/// HELPERS? //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const debug = Debug('keyv-file');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function isNumber(val: any): val is number {
  return typeof val === 'number';
}

/// DATA STRUCTURES ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export interface Data<V> {
  expire?: number;
  value: V;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export const defaultOpts = {
  filename: `${os.tmpdir()}/keyv-file/default-rnd-${Math.random()
    .toString(36)
    .slice(2)}.json`,
  expiredCheckDelay: 24 * 3600 * 1000, // ms
  writeDelay: 100, // ms
  encode: JSON.stringify as any as (val: any) => any,
  decode: JSON.parse as any as (val: any) => any
};

/// FIELD IMPLEMENTATION //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export class Field<T, D extends T | void> {
  constructor(
    protected kv: KeyvFile,
    protected key: string,
    protected defaults?: D
  ) {}

  get(): D;
  get(def: D): D;
  get(def = this.defaults) {
    return this.kv.get(this.key, def);
  }
  set(val?: T) {
    return this.kv.set(this.key, val);
  }
  delete() {
    return this.kv.delete(this.key);
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export function makeField<T = any>(kv: KeyvFile, key: string, defaults?: T) {
  return new Field(kv, key, defaults);
}

/// ADAPTER IMPLEMENTATION ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export class KeyvFile<V = any> {
  ttlSupport = true;
  private _opts = defaultOpts;
  private _cache: Map<string, Data<V>>;
  private _lastExpire: number;

  constructor(opts?: Partial<typeof defaultOpts>) {
    this._opts = {
      ...this._opts,
      ...opts
    };
    try {
      const data = this._opts.decode(fs.readFileSync(this._opts.filename, 'utf8'));
      if (!Array.isArray(data.cache)) {
        const _cache = data.cache;
        data.cache = [];
        for (const key in _cache) {
          data.cache.push([key, _cache[key]]);
        }
      }
      this._cache = new Map(data.cache);
      this._lastExpire = data.lastExpire;
    } catch (e) {
      debug(e);
      this._cache = new Map();
      this._lastExpire = Date.now();
    }
  }

  isExpired(data: Data<V>) {
    return isNumber(data.expire) && data.expire <= Date.now();
  }

  get<T = V>(key: string, defaults: T): T;
  get<T = V>(key: string): T | void;
  get<T = V>(key: string, defaults?: T): T | void {
    try {
      const data = this._cache.get(key);
      if (!data) {
        return defaults;
      } else if (this.isExpired(data)) {
        this.delete(key);
        return defaults;
      } else {
        return data.value as any as T;
      }
    } catch (error) {
      console.error(error);
    }
  }

  has(key: string) {
    return typeof this.get(key) !== 'undefined';
  }

  async *iterator(namespace?: string) {
    const items = this._cache.entries();
    for (const [key, value] of items) {
      yield { key, value };
    }
  }

  keys() {
    let keys = [] as string[];
    for (const key of this._cache.keys()) {
      if (!this.isExpired(this._cache.get(key)!)) {
        keys.push(key);
      }
    }
    return keys;
  }
  /**
   *
   * @param key
   * @param value
   * @param ttl time-to-live, seconds
   */
  set<T = V>(key: string, value: T, ttl?: number) {
    if (ttl === 0) {
      ttl = undefined;
    }
    this._cache.set(key, {
      value: value as any,
      expire: isNumber(ttl) ? Date.now() + ttl : undefined
    });
    return this.save();
  }

  delete(key: string): boolean {
    let ret = this._cache.delete(key);
    this.save();
    return ret;
  }

  clear() {
    this._cache = new Map();
    this._lastExpire = Date.now();
    return this.save();
  }

  clearExpire() {
    const now = Date.now();
    if (now - this._lastExpire <= this._opts.expiredCheckDelay) {
      return;
    }
    for (const key of this._cache.keys()) {
      const data = this._cache.get(key);
      if (this.isExpired(data!)) {
        this._cache.delete(key);
      }
    }
    this._lastExpire = now;
  }

  saveToDisk() {
    const cache = [] as [string, Data<V>][];
    for (const [key, val] of this._cache) {
      cache.push([key, val]);
    }
    const data = this._opts.encode({
      cache,
      lastExpire: this._lastExpire
    });
    return new Promise<void>((resolve, reject) => {
      fs.outputFile(this._opts.filename, data, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  private _savePromise?: Promise<any>;
  save() {
    this.clearExpire();
    if (this._savePromise) {
      return this._savePromise;
    }
    this._savePromise = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        this.saveToDisk()
          .then(() => {
            this._savePromise = void 0;
          })
          .then(resolve, reject);
      }, this._opts.writeDelay);
    });
    return this._savePromise;
  }
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default KeyvFile;
