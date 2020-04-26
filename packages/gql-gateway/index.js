const { ApolloGateway, RemoteGraphQLDataSource } = require("@apollo/gateway");
const { ApolloServer } = require("apollo-server");
const FED_HASURA_URL = process.env.FED_HASURA_URL || 'http://localhost:9001/';
const { applyMiddleware } = require("graphql-middleware");

class PassthroughHeadersDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (!context.req) {
      return;
    }

    const headers = context.req.headers;
    for (let key in headers) {
      if(headers.hasOwnProperty(key)) {
        request.http.headers.set(key, headers[key]);
      }
    }
  }
}

const gateway = new ApolloGateway({
  serviceList: [{ name: "hasura", url: FED_HASURA_URL }],
  buildService({name, url}) {
    return new PassthroughHeadersDataSource({url});
  }
});

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

(async () => {
  const { schema, executor } = await gateway.load();

  const server = new ApolloServer({ schema: applyMiddleware(schema, logInput, logResult), executor, context: ({req}) => {
    return { req };
  } });

  server.listen({ port: 9000 }).then(({ url }) => {
    console.log(`🚀 Gateway ready at ${url}`);
  });
})();
