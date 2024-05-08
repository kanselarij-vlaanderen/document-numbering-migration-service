# document-numbering-migration-service

 A migration service to enrich existing subcases and pieces with the new document numbering functionality of Kaleidos

 ## Executing the migration

 Add the following snippet to your `docker-compose(.override).yml` file:

 ```yml
document-numbering-migration:
  image: kanselarij/document-numbering-migration-service:feature-KAS-4606
  ports:
    - 8888:80
 ```

 Then execute the following command in your terminal: `curl localhost:8888`.

 You can follow up what the service is doing by checking its Docker logs.

 The service will stop when a document name does not match the generated agenda-activity-number.
 Add this to override this locally.
 ```yml
  environment:
    ALLOW_MISMATCHING_DOCUMENT_NAMES: "true"
 ```
