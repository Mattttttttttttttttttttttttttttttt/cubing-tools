// helpers.js — ported from helpers.py
// All functions exported as named exports for ES module usage

export function numPart(time) {
  /**
   * extracts the decimal part of a string
   * @param {string} time - string to be extracted
   * @returns {string} decimal in string, minutes converted to seconds
   */
  return [...String(time)].filter(c => /[\d.:]/.test(c)).join('');
}

export function noBrackets(time) {
  /**
   * get rid of the bracket part in the input string
   * @param {string} time - the string to be processed
   * @returns {string} the resultant string without the bracket part
   */
  return String(time).replace(/\[.*?\]/g, '');
}

export function noMultiphase(time) {
  /**
   * get rid of the equal sign part in the input string
   * @param {string} time - the string to be processed
   * @returns {string} the resultant string without the equal sign part
   */
  let r = String(time).replace(/=.*?,/g, ',');
  return r.replace(/=.*?$/gm, '');
}

export function noParen(time) {
  /**
   * get rid of the parentheses part in the input string
   * @param {string} time - the string to be processed
   * @returns {string} the resultant string without the parentheses part
   */
  return String(time).replace(/[()]/g, '');
}

export function validNum(num) {
  /**
   * adds 0 before a one-digit number
   * @param {number} num - number to be modified
   * @returns {string} the resultant string
   */
  const s = String(num);
  return s.split('.')[0].length === 1 && !s.startsWith('-') ? '0' + s : s;
}

export function minutes(a) {
  /**
   * used for the min and max function to convert min:sec into seconds
   * @param {string|number} a - the time in a string
   * @returns {number} the converted time in seconds
   */
  if (typeof a === 'number' && !isNaN(a)) return a;
  const s = String(a);
  if (s.includes('DNF')) return Number.MAX_SAFE_INTEGER;
  const np = numPart(s);
  if (np.includes(':')) {
    const [minPart, secPart] = np.split(':');
    const dec = secPart.includes('.') ? secPart.split('.')[1].length : 0;
    return +((parseFloat(secPart) + 60 * parseInt(minPart)).toFixed(dec));
  }
  return parseFloat(np) || 0;
}

export function seconds(a) {
  /**
   * converts a potential min:sec in string or float back to a min:sec string
   * @param {string|number} a - the string or integer to be converted (e.g. 60.67)
   * @returns {string} a string of min:sec or the original float
   */
  if (a === 'DNF') return 'DNF';
  const str = String(a);
  const hasPlus = str.endsWith('+');
  const numStr = hasPlus ? str.slice(0, -1) : str;
  const val = parseFloat(numStr);
  if (isNaN(val)) return str;
  const dec = numStr.includes('.') ? numStr.split('.')[1].length : 0;
  const suffix = hasPlus ? '+' : '';
  if (val < 60) return str;
  const mins = Math.floor(val / 60);
  const secsFixed = (val % 60).toFixed(dec);
  const secsNum = parseFloat(secsFixed);
  const secsStr = secsNum < 10 ? '0' + secsFixed : secsFixed;
  return `${mins}:${secsStr}${suffix}`;
}

export function ndnf(a) {
  /**
   * filters out dnfs
   * @param {string|*} a - the solve
   * @returns {boolean} whether it's a dnf
   */
  return typeof a === 'string' ? !a.includes('DNF') : true;
}

export function ydnf(a) {
  /**
   * filters out non-dnfs
   * @param {string|*} a - the solve
   * @returns {boolean} whether it's a non-dnf
  */
  return typeof a === 'string' ? a.includes('DNF') : false;
}

export function prths(a) {
  /**
   * used for the keep function to keep all solves with parentheses
   * @param {string} a - the string to be analyzed
   * @returns {boolean} whether a starts with a parenthese
   */
  return String(a)[0] === '(';
}

export function nprths(a) {
  /**
   * used for the keep function to keep all solves without parentheses
   * @param {string} a - the string to be analyzed
   * @returns {boolean} whether a starts without a parenthese
   */
  return String(a)[0] !== '(';
}

export function findAll(parent, daughter) {
  /**
   * count how many substrings is present in the parent string
   * @param {string|Array} parent - the parent string to search in
   * @param {string} daughter - the substring needing to be searched
   * @returns {number} the count of how many substrings is present
   */
  const s = Array.isArray(parent) ? parent.join('') : String(parent);
  let count = 0, idx = 0;
  while ((idx = s.indexOf(daughter, idx)) !== -1) { count++; idx += daughter.length; }
  return count;
}

export function deepjoin(lst, joiner) {
  /**
   * returns a list converted into strs and joined with joiner
   * @param {Array} lst - the list to be joined
   * @param {string} joiner - the connector between elements
   * @returns {string} the resultant string
   */
  return lst.map(String).join(joiner);
}

export function frwrd(lst, start, value) {
  /**
   * returns a list of *value* values frwrd in *lst* starting at *start* index
   * @param {Array} lst - list to be processed
   * @param {number} start - starting index
   * @param {number} value - number of values to go
   * @returns {Array} processed list
   */
  return lst.slice(start, start + value);
}

export function repeat(lst) {
  /**
   * checks for any repeat in the list
   * @param {Array} lst - the list to be processed
   * @returns {Object} a dictionary of repeat to the number of times it appeared
   */
  const sorted = [...lst.filter(ndnf)].sort((a, b) => parseFloat(a) - parseFloat(b));
  const result = {};
  let i = 0;
  while (i < sorted.length) {
    let count = 1;
    while (i + count < sorted.length && sorted[i] === sorted[i + count]) count++;
    if (count > 1) result[sorted[i]] = count;
    i += count;
  }
  return result;
}

function _isDNF(s) { return String(s).includes('DNF'); }

function _minEl(arr) {
  let best = arr[0], bestV = minutes(arr[0]);
  for (const s of arr) { const v = minutes(s); if (v < bestV) { bestV = v; best = s; } }
  return best;
}
function _maxEl(arr) {
  let best = arr[0], bestV = minutes(arr[0]);
  for (const s of arr) { const v = minutes(s); if (v > bestV) { bestV = v; best = s; } }
  return best;
}

function trimArr(arr) {
  const minE = _minEl(arr), maxE = _maxEl(arr);
  arr.splice(arr.indexOf(minE), 1);
  arr.splice(arr.indexOf(maxE), 1);
}

export function avg(solves, numSolves, decimals = 0) {
  /**
   * returns average of num_solves
   * @param {Array<string>} solves - solves in seconds with DNFs as DNFs
   * @param {number} numSolves - the length of the average
   * @param {number} [decimals=0] - the amount of decimals, if not provided, no rounding will be done
   * @returns {number|string} average value
   */
  if (numSolves <= 2) throw new Error('avg requires >= 3 solves');
  // cstimer trims ceil(n * 5%) = ceil(n/20) from each end (not floor(n/20)+1)
  const delete_ = Math.ceil(numSolves / 20);

  if (numSolves === 3) {
    if (solves.some(_isDNF)) return Number.MAX_SAFE_INTEGER;
    const sum = solves.reduce((acc, s) => acc + parseFloat(s), 0);
    return decimals ? +(sum / numSolves).toFixed(decimals) : sum / numSolves;
  }

  const nonDnfs = solves.filter(s => !_isDNF(s));
  if (nonDnfs.length >= numSolves - delete_) {
    const copy = [...solves];
    for (let i = 0; i < delete_; i++) trimArr(copy);
    const sum = copy.reduce((acc, s) => acc + parseFloat(s), 0);
    const count = numSolves - 2 * delete_;
    return decimals ? +(sum / count).toFixed(decimals) : sum / count;
  }
  return 'DNF';
}

export function avgCompare(time) {
  /**
   * compares averages
   * @param {string|number} time - the avg
   * @returns {number} the interpretation
   */
  return time === 'DNF' ? Number.MAX_SAFE_INTEGER : time;
}

export function roundDecimal(solves, avgVal) {
  /**
   * rounds the avg of solves to the maximum decimal present in the solves
   * @param {Array} solves - the list of solves
   * @param {string} avgVal - a string of the time of the average
   * @returns {string} a rounded string of the time of the average
   */
  if (avgVal === 'DNF') return 'DNF';
  let decimals = Math.max(...solves.map(s => {
    const np = numPart(s);
    return np.includes('.') ? np.split('.')[1].length : 0;
  }));
  if (decimals === 0) decimals = 2;

  let result = String(avgVal);
  const curDec = () => result.includes('.') ? result.split('.')[1].length : 0;

  if (curDec() > decimals) {
    const val = minutes(result);
    const rounded = +val.toFixed(decimals);
    result = seconds(String(rounded));
  }
  if (curDec() === 0) result += '.';
  return result + '0'.repeat(Math.max(0, decimals - curDec()));
}

// ── Average Generator specific ──────────────────────────────────────────────

export function minutesDnf(a) {
  const s = String(a);
  if (s.includes('DNF')) return s;
  const np = numPart(s);
  if (np.includes(':')) {
    const [m, sec] = np.split(':');
    const dec = sec.includes('.') ? sec.split('.')[1].length : 0;
    return +(parseFloat(sec) + 60 * parseInt(m)).toFixed(dec);
  }
  return parseFloat(np);
}

export function addSeconds(secStr, delta) {
  /**
   * string-safe integer add/subtract on a plain decimal-seconds string,
   * to avoid floating point error (e.g. 1.256 + 2 -> "3.256", not 3.2560000000000002)
   * @param {string|number} secStr - seconds with no colon, e.g. "1.256"
   * @param {number} delta - integer seconds to add (may be negative)
   * @returns {string} the adjusted seconds string
   */
  const [intPart, decPart] = String(secStr).split('.');
  const newInt = parseInt(intPart, 10) + delta;
  return decPart !== undefined ? `${newInt}.${decPart}` : String(newInt);
}

export function plusTwoSolve(raw, penalty) {
  // returns new penalty state - toggles +2
  if (penalty === 'dnf') return 'dnf'; // can't +2 a DNF (handled in UI)
  return penalty === 'p2' ? null : 'p2';
}

export function dnfSolve(raw, penalty) {
  return penalty === 'dnf' ? null : 'dnf';
}

export function solveString(raw, penalty) {
  // Given a raw time string and penalty, return the formatted solve string
  if (!raw) return '';
  if (penalty === 'dnf') return `DNF(${raw})`;
  if (penalty === 'p2') {
    return seconds(addSeconds(String(minutes(raw)), 2)) + '+';
  }
  return raw;
}

function addParenthese(copy, solves) {
  const fastEl = _minEl(copy);
  copy.splice(copy.indexOf(fastEl), 1);
  const fi = solves.findIndex(s => noParen(s) === fastEl || s === fastEl);
  if (fi !== -1) solves[fi] = '(' + solves[fi] + ')';

  const slowEl = _maxEl(copy);
  copy.splice(copy.indexOf(slowEl), 1);
  const si = solves.findIndex(s => noParen(s) === slowEl || s === slowEl);
  if (si !== -1) solves[si] = '(' + solves[si] + ')';
}

export function avgStr(num, solvesIn) {
  // solvesIn: array of formatted strings like "9.45", "DNF(9.45)", "11.45+"
  const solves = [...solvesIn];
  const dnfs = findAll(solves.join(''), 'DNF');

  if (num === 3) {
    // mean of 3
    if (dnfs > 0) {
      if (dnfs !== 3) {
        const fi = solves.reduce((best, s, i) =>
          minutes(minutesDnf(s)) < minutes(minutesDnf(solves[best])) ? i : best, 0);
        solves[fi] = `**${solves[fi]}**`;
      }
      return { avg: 'DNF', solves };
    }
    const rawVals = solves.map(s => String(minutesDnf(s)));
    const avgVal = roundDecimal(solves, seconds(String(avg(rawVals, 3))));
    const fi = solves.reduce((best, s, i) =>
      minutes(s) < minutes(solves[best]) ? i : best, 0);
    solves[fi] = `**${solves[fi]}**`;
    return { avg: avgVal, solves };
  }

  // average of n (trim best/worst) — cstimer trims ceil(n/20) from each end
  const delete_ = Math.ceil(num / 20);
  const copy = [...solves];
  const rawVals = solves.map(s => String(minutesDnf(s)));
  const avgVal = roundDecimal(solvesIn, seconds(String(avg(rawVals, num))));
  for (let i = 0; i < delete_; i++) addParenthese(copy, solves);
  return { avg: avgVal, solves };
}

export function isTimeList(ts) {
  /**
   * check whether the string given is a comma-separated time list
   * @param {string} ts - the string to be checked
   * @returns {boolean} - whether it's a comma-separated time list
   */
  return ts.split(",").map(
    (t) => /^[0-9.()DNFdnf+:]+$/.test(
      t?.trim()?.replaceAll(/\[.*?\]/g, "")
    )).every(Boolean);
}

export function isCstimerFormat(ts) {
  /**
   * check whether the string given is of cstimer format
   * @param {string} ts - the string to be checked
   * @returns {boolean} - whether it's of cstimer format
   */
  return ts.includes('avg of') && ts.includes('Time List:');
}

// ── Stats Calculator ─────────────────────────────────────────────────────────

export function stdev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (arr.length - 1));
}

export function parsePaste(raw) {
  /**
   * performs a full parse from a pastearea value
   * @param {string} raw - the text to be analyzed
   * @returns {Object} - null, or the final object containing {ao, avgVal, decimals, length, r, timeList}
   */
  let ao, avgVal;
  if (!isCstimerFormat(raw) && !isTimeList(raw) ) return null;
  try {
    const cstimer = raw.indexOf("avg of ") > -1;
    if (cstimer) {
      const after = raw.trim().split('avg of ')[1] || raw;
      const firstLine = after.split('\n')[0];
      avgVal = firstLine.slice(firstLine.indexOf(':') + 1).trim();
      ao = after.split('Time List:')[1];
    }
    else ao = raw;

    const timeList = noMultiphase(noBrackets(ao)).split(',').map(s => s.trim()).filter(Boolean);
    if (!timeList.length) return null;
    length = timeList.length;
    const decimals = Math.max(...timeList.map(s => {
      const np = numPart(s);
      return np.includes('.') ? np.split('.')[1].length : 0;
    }));
    const r = timeList.map(s => ndnf(s) ? String(minutes(numPart(s))) : 'DNF');
    if (!cstimer) avgVal = avg(r, length, decimals);
    return {ao, avgVal, decimals, length, r, timeList}
  } catch(e) { console.error(e); return null; }
}
