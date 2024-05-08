import { sparqlEscapeUri } from 'mu';
import { querySudo } from '@lblod/mu-auth-sudo';
import { parseSparqlResponse } from './utils';
import CONSTANTS from '../constants';

async function getSubcasePieces(subcase) {
  const queryString = `PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
PREFIX pav: <http://purl.org/pav/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX besluitvor: <https://data.vlaanderen.be/ns/besluitvorming#>
PREFIX dossier: <https://data.vlaanderen.be/ns/dossier#>

SELECT DISTINCT ?piece ?pieceName ?pieceType ?documentContainer
FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.PUBLIC)}
FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)}
WHERE {
  ?submissionActivity ext:indieningVindtPlaatsTijdens ${sparqlEscapeUri(subcase)} ;
                      prov:generated ?piece .
  FILTER NOT EXISTS { [] pav:previousVersion ?piece }
  ?piece dct:title ?pieceName ;
         ^dossier:Collectie.bestaatUit ?documentContainer .
  OPTIONAL { ?documentContainer dct:type ?pieceType . }
}
ORDER BY ?pieceName`;

  const response = await querySudo(queryString);
  const results = parseSparqlResponse(response);

  return results;
}

export {
  getSubcasePieces,
}
