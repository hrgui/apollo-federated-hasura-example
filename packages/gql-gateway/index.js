const {ApolloGateway} = require('@apollo/gateway');
const {ApolloServer} = require('apollo-server');

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'hasura', url: 'http://localhost:9001' }
  ]
});

(async () => {
  const { schema, executor } = await gateway.load();

  const server = new ApolloServer({ schema, executor });

  server.listen({port: 9000}).then(({ url }) => {
    console.log(`🚀 Gateway ready at ${url}`);
  });
})();