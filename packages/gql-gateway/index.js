const { ApolloGateway } = require("@apollo/gateway");
const { ApolloServer } = require("apollo-server");
const FED_HASURA_URL = process.env.FED_HASURA_URL || 'http://localhost:9001/';

const gateway = new ApolloGateway({
  serviceList: [{ name: "hasura", url: FED_HASURA_URL }],
});

(async () => {
  const { schema, executor } = await gateway.load();

  const server = new ApolloServer({ schema, executor });

  server.listen({ port: 9000 }).then(({ url }) => {
    console.log(`🚀 Gateway ready at ${url}`);
  });
})();
