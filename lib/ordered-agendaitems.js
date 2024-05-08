import { sparqlEscapeUri, sparqlEscapeDateTime } from 'mu';
import { querySudo } from '@lblod/mu-auth-sudo';
import { parseSparqlResponse } from './utils';
import { startOfYear, endOfYear } from 'date-fns';
import CONSTANTS from '../constants';

async function getOrderedAgendaitems(year=2024) {
  if (typeof(year) !== 'number' || year < 2019) {
    throw new Error('Year must be a number after 2019');
  }
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));

  const queryString = `PREFIX schema: <http://schema.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX generiek: <http://data.vlaanderen.be/ns/generiek#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX besluitvor: <https://data.vlaanderen.be/ns/besluitvorming#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

SELECT DISTINCT ?subcase ?subcaseType ?agendaitemType ?meetingType
FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.PUBLIC)}
FROM ${sparqlEscapeUri(CONSTANTS.GRAPHS.KANSELARIJ)}
WHERE {
  { SELECT DISTINCT ?agendaitemType ?subcase ?subcaseType ?agendaApprovedDateTime ?agendaitemTypePosition ?agendaitemPosition ?meetingType
    WHERE {
      { SELECT DISTINCT ?agenda ?agendaitemType ?agendaApprovedDateTime ?agendaitem ?agendaitemPosition ?agendaitemTypePosition ?meetingType
        WHERE {

          ?agendaStatusActivity prov:used ?agenda ;
                                generiek:bewerking <http://themis.vlaanderen.be/id/concept/agenda-status/fff6627e-4c96-4be1-b483-8fefcc6523ca> ;
                                prov:startedAtTime ?agendaApprovedDateTime .
          FILTER (?agendaApprovedDateTime >= ${sparqlEscapeDateTime(start)})
          FILTER (?agendaApprovedDateTime <= ${sparqlEscapeDateTime(end)})

          ?agenda besluitvor:isAgendaVoor ?meeting ;
                  dct:hasPart ?agendaitem .
          ?meeting dct:type ?meetingType .
          ?agendaitem schema:position ?agendaitemPosition ;
                      dct:type ?agendaitemType .
          ?agendaitemType schema:position ?agendaitemTypePosition .
        } }
      ?agendaitem ^besluitvor:genereertAgendapunt / prov:wasInformedBy / ext:indieningVindtPlaatsTijdens ?subcase .
      OPTIONAL { ?subcase dct:type ?subcaseType }
    }
    ORDER BY ?agendaApprovedDateTime ?agendaitemTypePosition ?agendaitemPosition }
}`;

  const response = await querySudo(queryString);
  const results = parseSparqlResponse(response);

  return results;
}

export {
  getOrderedAgendaitems,
}
