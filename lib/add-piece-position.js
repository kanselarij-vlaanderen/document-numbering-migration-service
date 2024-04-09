import { sparqlEscapeUri, sparqlEscapeInt } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';
import CONSTANTS from "../constants";

async function addPiecePosition(piece, position) {
  const queryString = `PREFIX schema: <http://schema.org/>
INSERT DATA {
  GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
    ${sparqlEscapeUri(piece)} schema:position ${sparqlEscapeInt(position)} .
  }
}`;
  await updateSudo(queryString);
}

export {
  addPiecePosition,
}