// This is here only because of https://github.com/apollographql/apollo-server/pull/4040
// Once  This is https://github.com/apollographql/apollo-server/pull/4040 is merged or resolved, this is not needed.
const {executeQueryPlan} = require('./_apolloExecuteQueryPlan');
const {buildOperationContext, buildQueryPlan, serializeQueryPlan} = require("@apollo/gateway");

function createExecutor(gateway) {
  async function executor (requestContext) {
    const { request, document, queryHash } = requestContext;
    const queryPlanStoreKey = queryHash + (request.operationName || '');
    const operationContext = buildOperationContext(
      gateway.schema,
      document,
      request.operationName,
    );

    // No need to build a query plan if we know the request is invalid beforehand
    // In the future, this should be controlled by the requestPipeline
    const validationErrors = gateway.validateIncomingRequest(
      requestContext,
      operationContext,
    );

    if (validationErrors.length > 0) {
      return { errors: validationErrors };
    }

    let queryPlan;
    if (gateway.queryPlanStore) {
      queryPlan = await gateway.queryPlanStore.get(queryPlanStoreKey);
    }

    if (!queryPlan) {
      queryPlan = buildQueryPlan(operationContext, {
        autoFragmentization: Boolean(
          gateway.config.experimental_autoFragmentization,
        ),
      });
      if (gateway.queryPlanStore) {
        // The underlying cache store behind the `documentStore` returns a
        // `Promise` which is resolved (or rejected), eventually, based on the
        // success or failure (respectively) of the cache save attempt.  While
        // it's certainly possible to `await` this `Promise`, we don't care about
        // whether or not it's successful at this point.  We'll instead proceed
        // to serve the rest of the request and just hope that this works out.
        // If it doesn't work, the next request will have another opportunity to
        // try again.  Errors will surface as warnings, as appropriate.
        //
        // While it shouldn't normally be necessary to wrap this `Promise` in a
        // `Promise.resolve` invocation, it seems that the underlying cache store
        // is returning a non-native `Promise` (e.g. Bluebird, etc.).
        Promise.resolve(
          gateway.queryPlanStore.set(queryPlanStoreKey, queryPlan),
        ).catch(err =>
          gateway.logger.warn(
            'Could not store queryPlan' + ((err && err.message) || err),
          ),
        );
      }
    }

    const serviceMap = Object.entries(gateway.serviceMap).reduce(
      (serviceDataSources, [serviceName, { dataSource }]) => {
        serviceDataSources[serviceName] = dataSource;
        return serviceDataSources;
      },
      Object.create(null)
    );

    if (gateway.experimental_didResolveQueryPlan) {
      gateway.experimental_didResolveQueryPlan({
        queryPlan,
        serviceMap,
        operationContext,
      });
    }

    const response = await executeQueryPlan(
      queryPlan,
      serviceMap,
      requestContext,
      operationContext,
    );

    const shouldShowQueryPlan =
      gateway.config.__exposeQueryPlanExperimental &&
      request.http &&
      request.http.headers &&
      request.http.headers.get('Apollo-Query-Plan-Experimental');

    // We only want to serialize the query plan if we're going to use it, which is
    // in two cases:
    // 1) non-empty query plan and config.debug === true
    // 2) non-empty query plan and shouldShowQueryPlan === true
    const serializedQueryPlan =
      queryPlan.node && (gateway.config.debug || shouldShowQueryPlan)
        ? serializeQueryPlan(queryPlan)
        : null;

    if (gateway.config.debug && serializedQueryPlan) {
      gateway.logger.debug(serializedQueryPlan);
    }

    if (shouldShowQueryPlan) {
      // TODO: expose the query plan in a more flexible JSON format in the future
      // and rename this to `queryPlan`. Playground should cutover to use the new
      // option once we've built a way to print that representation.

      // In the case that `serializedQueryPlan` is null (on introspection), we
      // still want to respond to Playground with something truthy since it depends
      // on this to decide that query plans are supported by this gateway.
      response.extensions = {
        __queryPlanExperimental: serializedQueryPlan || true,
      };
    }
    return response;
  };

  return executor;
}


module.exports = {
  createExecutor
};