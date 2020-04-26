FROM hasura/graphql-engine:v1.1.1.cli-migrations
COPY ./migrations /hasura-migrations