import { sparqlEscapeUri, sparqlEscapeString } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';
import CONSTANTS from '../constants';

async function addPieceOriginalName(piece, originalName) {
  const queryString = `PREFIX dct: <http://purl.org/dc/terms/>
INSERT DATA {
  GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
    ${sparqlEscapeUri(piece)} dct:alternative ${sparqlEscapeString(originalName)} .
  }
}`;
  await updateSudo(queryString);
}

export {
  addPieceOriginalName,
}