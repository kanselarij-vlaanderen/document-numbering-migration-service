import { app, errorHandler } from 'mu';
import VRDocumentName from './lib/vr-name';
import CONSTANTS from './constants';
import { getOrderedAgendaitems } from './lib/ordered-agendaitems';
import { getSubcasePieces } from './lib/subcase-pieces';
import { addAgendaSubcaseId } from './lib/add-agenda-subcase-id';
import { addPiecePosition } from './lib/add-piece-position';
import { addPieceOriginalName } from './lib/add-piece-original-name';

const SPECIALLEKES = {
  INGETROKKEN: "http://themis.vlaanderen.be/id/procedurestap/664C58ED079ED7820208A94C",
  FOUTE_NUMMER: "http://themis.vlaanderen.be/id/procedurestap/66573F4D079ED7820208BE23",

  NUMMER_780: "http://themis.vlaanderen.be/id/procedurestap/66549A46079ED7820208B598",
  NUMMER_781: "http://themis.vlaanderen.be/id/procedurestap/66549C90079ED7820208B8E0",

  DUBBEL: "http://themis.vlaanderen.be/id/procedurestap/665EBC0D079ED7820208C7EF",
}

app.get('/', async function (req, res) {
  res.sendStatus(202);

  const results = await getOrderedAgendaitems(2024);

  const knownSubcases = new Set();
  const errors = [];
  const addError = (thing) => errors.push(thing);

  const counters = {
    regular: {
      doc: 0,
      med: 0,
      dec: 0,
    },
    pvv: {
      doc: 0,
      med: 0,
      dec: 0,
    },
  }
  for (const result of results) {
    const {
      subcase,
      agendaitemType,
      subcaseType,
      meetingType,
    } = result;

    if (knownSubcases.has(subcase)) {
      console.debug(`Skipping subcase <${subcase}>`);
      continue;
    }
    knownSubcases.add(subcase);

    console.debug(result);

    const piecesResults = await getSubcasePieces(subcase);
    let hasDecreetPiece = false;
    for (const { pieceType } of piecesResults) {
      if (pieceType === CONSTANTS.PIECE_TYPES.DECREET) {
        hasDecreetPiece = true;
      }
    }

    const isMed = agendaitemType === CONSTANTS.AGENDA_ITEM_TYPES.MEDEDELING;
    const isDec = agendaitemType === CONSTANTS.AGENDA_ITEM_TYPES.NOTA && subcaseType === CONSTANTS.SUBCASE_TYPES.BEKRACHTIGING && hasDecreetPiece;
    const isDoc = !isDec && agendaitemType === CONSTANTS.AGENDA_ITEM_TYPES.NOTA;

    console.debug('isDoc:', isDoc);
    console.debug('isMed:', isMed);
    console.debug('isDec:', isDec);

    // Counters
    let counter;
    if (meetingType === CONSTANTS.MEETING_TYPES.PVV) {
      counter = 1 + (isDec ? counters.pvv.dec : isDoc ? counters.pvv.doc : counters.pvv.med);
    } else {
      counter = 1 + (isDec ? counters.regular.dec : isDoc ? counters.regular.doc : counters.regular.med);
    }

    if (subcase === SPECIALLEKES.INGETROKKEN) {
      console.debug('###### DEALING WITH FAULTY SUBCASE (ingetrokken) --- NOT NUMBERING SUBCASE, BUT INCREASING COUNTER');
      counters.regular.doc++;
      continue;
    } else if (subcase === SPECIALLEKES.FOUTE_NUMMER) {
      console.debug('###### DEALING WITH FAULTY SUBCASE (foute nummer) --- NUMBERING SUBCASE USING HARDCODED NUMBER 765');
      counter = 765;
    } else if (subcase === SPECIALLEKES.NUMMER_780) {
      console.debug('###### DEALING WITH FAULTY SUBCASE (780) --- NUMBERING SUBCASE USING HARDCODED NUMBER 780, NOT CHANGING COUNTER');
      counter = 780;
    } else if (subcase === SPECIALLEKES.NUMMER_781) {
      console.debug('###### DEALING WITH FAULTY SUBCASE (781) --- NUMBERING SUBCASE USING HARDCODED NUMBER 781, UPDATING COUNTER AND SKIPPING THE MISSING 780');
      counters.regular.doc++;
      counter = 781;
    } else if (subcase === SPECIALLEKES.DUBBEL) {
      console.debug('###### DEALING WITH FAULTY SUBCASE (dubbel gemaakt) --- NUMBERING SUBCASE USING HARDCODED NUMBER 189, NOT CHANGING COUNTER');
      counter = 189;
    }

    const pieces = [];
    let counterMatched = false;
    for (const { piece, pieceName, documentContainer } of piecesResults) {
      let vrDoc = null;
      try {
        vrDoc = new VRDocumentName(pieceName);
      } catch {
        console.debug(`Could not parse piece name ${pieceName}. Probably a piece from testing, skipping`);
        continue;
      }
      pieces.push({ piece, pieceName, vrDoc, documentContainer });

      // Validation
      if (isDoc && isMed) {
        addError({ subcase, counter, vrDoc, message: 'Marked as a NOTA and a MEDEDELING' });
      }

      if (isDec && isMed) {
        addError({ subcase, counter, vrDoc, message: 'Marked as a DECREET and a MEDEDELING' });
      }

      if (vrDoc.caseNr !== counter) {
        console.debug(JSON.stringify({ subcase, counter, vrDoc, message: 'Counter on piece name and calculated counter do not match' }));
        addError({ subcase, counter, vrDoc, message: 'Counter on piece name and calculated counter do not match' });
      } else {
        counterMatched = true;
      }
    }

    if ((counterMatched || process.env.ALLOW_MISMATCHING_DOCUMENT_NAMES) &&
      // Don't increase counter for faulty subcase
      subcase !== SPECIALLEKES.FOUTE_NUMMER &&
      subcase !== SPECIALLEKES.NUMMER_780 &&
      subcase !== SPECIALLEKES.DUBBEL
    ) {
      if (meetingType === CONSTANTS.MEETING_TYPES.PVV) {
        isDec
          ? counters.pvv.dec++
          : isDoc
            ? counters.pvv.doc++
            : counters.pvv.med++;
      } else {
        isDec
          ? counters.regular.dec++
          : isDoc
            ? counters.regular.doc++
            : counters.regular.med++;
      }
    }

    const sortedPieces = pieces.sort((a, b) => {
      return a.vrDoc.meta.index - b.vrDoc.meta.index;
    });

    for (const [index, { vrDoc }] of sortedPieces.entries()) {
      console.debug('Agenderingsactiviteitnummer:', vrDoc.meta.caseNrRaw, 'Index:', vrDoc.meta.index, vrDoc.name);
      if (pieces.length > 1 && vrDoc.meta.index !== index + 1) {
        addError({ subcase, counter, vrDoc, index: index + 1, indexFromPiece: vrDoc.meta.index, message: `Index in piece name does not match calculated index: ${index + 1}` });
      }
    }

    if (errors.length && !process.env.ALLOW_MISMATCHING_DOCUMENT_NAMES) {
      break;
    }

    // Add new data
    await addAgendaSubcaseId(subcase, counter);
    for (const [index, { piece, pieceName, documentContainer }] of sortedPieces.entries()) {
      await addPiecePosition(documentContainer, index + 1);
      await addPieceOriginalName(piece, pieceName);
    }
  }

  if (errors.length) {
    console.debug('Encountered following errors:', JSON.stringify(errors, null, 2));
  } else {
    console.debug('Finished processing files without any errors');
  }
});

app.use(errorHandler);
