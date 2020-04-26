FROM node:14-alpine

WORKDIR /app

# copy the initial stuff
COPY lerna.json ./
COPY package*.json ./
COPY yarn.lock ./

# now copy the dirs we need
COPY packages/gql-gateway ./packages/gql-gateway
RUN yarn
RUN ls -al 

EXPOSE 9000

CMD ["yarn", "gql-gateway-dev"]
