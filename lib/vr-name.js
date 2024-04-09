import { parse } from 'date-fns';
import invert from 'lodash.invert';

const numbersBylatinAdverbialNumberals = {
  '': 1,
  bis: 2,
  ter: 3,
  quater: 4,
  quinquies: 5,
  sexies: 6,
  septies: 7,
  octies: 8,
  novies: 9,
  decies: 10,
  undecies: 11,
  duodecies: 12,
  'ter decies': 13,
  'quater decies': 14,
  quindecies: 15,
};
const latinAdverbialNumberals = invert(numbersBylatinAdverbialNumberals);

const CONFIG = {
    numbersBylatinAdverbialNumberals,
    latinAdverbialNumberals,
};

export default class VRDocumentName {
  static get regexGroups() {
    return Object.freeze({
      date: '(?<date>[12][90][0-9]{2} [0-3][0-9][01][0-9])',
      casePrefix: '(?<casePrefix>( VV)|())',  // VV = Vlaamse Veerkracht
      docType: '(?<docType>(DOC)|(DEC)|(MED))',
      caseNr: '(?<caseNr>\\d{4})',
      index: '(?<index>\\d{1,3})',
      versionSuffix: `(?<versionSuffix>(${Object.values(CONFIG.latinAdverbialNumberals).map((suffix) => suffix.toUpperCase())
        .join(')|(')}))`.replace('()|', ''), // Hack to get out the value for piece '0'
    });
  }

  static get looseRegex() {
    const regexGroup = VRDocumentName.regexGroups;
    return new RegExp(`VR ${regexGroup.date}${regexGroup.casePrefix} ${regexGroup.docType}\\.${regexGroup.caseNr}([/-]${regexGroup.index})?(.*?)${regexGroup.versionSuffix}?$`);
  }

  static get strictRegex() {
    const regexGroup = VRDocumentName.regexGroups;
    return new RegExp(`^VR ${regexGroup.date}${regexGroup.casePrefix} ${regexGroup.docType}\\.${regexGroup.caseNr}(/${regexGroup.index})?${regexGroup.versionSuffix}?$`);
  }

  meta;

  constructor(name, options) {
    this.name = name?.trim();
    this.meta = this.parseMeta();
    this.strict = !!options && !!options.strict;
    if (this.strict && !this.isValid) {
      throw new Error(`Invalid VR Document Name "${this.name}" (strict mode)`);
    }
  }

  toString() {
    return this.name;
  }

  get regex() {
    return this.strict ? VRDocumentName.strictRegex : VRDocumentName.looseRegex;
  }

  parseMeta() {
    const match = this.regex.exec(this.name);
    if (!match) {
      throw new Error(`Couldn't parse VR Document Name "${this.name}" (${this.strict ? 'strict' : 'loose'} parsing mode)`);
    }
    const versionSuffix = match.groups.versionSuffix;
    let versionNumber = 1;
    if (versionSuffix) {
      versionNumber = CONFIG.numbersBylatinAdverbialNumberals[versionSuffix.toLowerCase()];
    }
    const date = parse(match.groups.date, 'yyyy ddMM', new Date());
    // TODO throw error when date is invalid (using isNaN(date) check)
    const meta = {
      dateRaw: match.groups.date,
      date,
      casePrefix: match.groups.casePrefix,
      docType: match.groups.docType,
      caseNrRaw: match.groups.caseNr,
      caseNr: parseInt(match.groups.caseNr, 10),
      indexNrRaw: match.groups.index,
      index: parseInt(match.groups.index, 10),
      versionSuffix,
      versionNumber,
    };
    return meta;
  }

  get isValid() {
    return VRDocumentName.strictRegex.test(this.name);
  }

  get withoutVersionSuffix() {
    return this.name.replace(new RegExp(`${VRDocumentName.regexGroups.versionSuffix}$`, 'ui'), '');
  }
  
  get caseNr() {
    return this.meta.caseNr;
  }

  withOtherVersionSuffix(pieceNr) {
    return `${this.withoutVersionSuffix}${CONFIG.latinAdverbialNumberals[pieceNr].toUpperCase()}`;
  }

  vrNumberWithSuffix() {
    try {
      const { meta } = this;
      const index = meta.indexNrRaw ? `/${meta.index}` : ''; 
      return `VR ${meta.dateRaw}${meta.casePrefix} ${meta.docType}.${meta.caseNrRaw}${index}${meta.versionSuffix || ''}`;
    } catch(error) {
      return this.name;
    }
  }

  vrDateOnly() {
    try {
      const { meta } = this;
      return `VR ${meta.dateRaw}${meta.casePrefix}`;
    } catch(error) {
      return this.vrNumberWithSuffix();
    }
  }

  withoutDate() {
    try {
      const { meta } = this;
      const index = meta.indexNrRaw ? `/${meta.index}` : ''; 
      const casePrefix = meta.casePrefix ? `${meta.casePrefix.trim()} ` : '';
      return `${casePrefix}${meta.docType}.${meta.caseNrRaw}${index}${meta.versionSuffix || ''}`;
    } catch(error) {
      return this.vrNumberWithSuffix();
    }
  }
}

export const compareFunction = function(parameterA, parameterB) {
  try {
    const metaA = parameterA.parseMeta();
    try { // Both names parse
      const metaB = parameterB.parseMeta();
      return (metaB.caseNr - metaA.caseNr) // Case number descending (newest first)
        || (metaA.index - metaB.index) // Index ascending
        || (metaB.date - metaA.date) // Date descending (newest first)
        || (metaB.versionNumber - metaA.versionNumber); // versionNumber descending (newest first)
    } catch { // Only a parses
      return -1;
    }
  } catch {
    try { // Only b parses
      parameterB.parseMeta();
      return 1;
    } catch { // Both don't parse
      return parameterA.name.localeCompare(parameterB.name);
    }
  }
};
