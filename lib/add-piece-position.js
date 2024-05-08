import { sparqlEscapeUri, sparqlEscapeInt } from 'mu';
import { updateSudo } from '@lblod/mu-auth-sudo';
import CONSTANTS from "../constants";

async function addPiecePosition(documentContainer, position) {
  const queryString = `PREFIX schema: <http://schema.org/>
INSERT DATA {
  GRAPH ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)} {
    ${sparqlEscapeUri(documentContainer)} schema:position ${sparqlEscapeInt(position)} .
  }
}`;
  await updateSudo(queryString);
}

export {
  addPiecePosition,
}
