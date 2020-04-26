const { ApolloServer } = require("apollo-server");
const fetch = require("node-fetch");
const { print } = require("graphql");
const { transformSchemaFederation } = require("graphql-transform-federation");
const PORT = process.env.PORT || 9001;
const HASURA_URL = process.env.HASURA_URL || "http://localhost:8080/v1/graphql";
const {
  makeRemoteExecutableSchema,
  introspectSchema,
} = require("graphql-tools");
const { applyMiddleware } = require("graphql-middleware");

const introspectSchemaFetcher = async ({
  query: queryDocument,
  variables,
  operationName,
}) => {
  const query = print(queryDocument);
  const fetchResult = await fetch(HASURA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables, operationName }),
  });
  const introspectionJSON = await fetchResult.json();
  // apollo-gateway doesnt like subscriptions
  delete introspectionJSON.data.__schema.subscriptionType;
  return introspectionJSON;
};

const fetcher = async ({
  query: queryDocument,
  variables,
  operationName,
}) => {
  const query = print(queryDocument);
  const fetchResult = await fetch(HASURA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables, operationName }),
  });
  return fetchResult.json();
};

const logInput = async (resolve, root, args, context, info) => {
  console.log(`1. logInput: ${JSON.stringify(args)}`);
  const result = await resolve(root, args, context, info);
  console.log(`5. logInput`);
  return result;
};

const logResult = async (resolve, root, args, context, info) => {
  console.log(`2. logResult`)
  const result = await resolve(root, args, context, info)
  console.log(`4. logResult: ${JSON.stringify(result)}`)
  return result
};

async function getHasuraSchema() {
  const rawSchema = await introspectSchema(introspectSchemaFetcher);
  let schema = makeRemoteExecutableSchema({
    schema: rawSchema,
    fetcher,
  });

  schema = applyMiddleware(schema, logInput, logResult);
  return transformSchemaFederation(schema, {});
}

(async () => {
  const schema = await getHasuraSchema();
  const server = new ApolloServer({ schema });

  server.listen({ port: PORT }).then(({ url }) => {
    console.log(`Federated Hasura ready at ${url}`);
  });
})();
