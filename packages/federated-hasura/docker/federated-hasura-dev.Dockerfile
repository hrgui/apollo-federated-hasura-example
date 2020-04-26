FROM node:14-alpine

WORKDIR /app

# copy the initial stuff
COPY lerna.json ./
COPY package*.json ./
COPY yarn.lock ./

# now copy the dirs we need
COPY packages/federated-hasura ./packages/federated-hasura
RUN yarn
RUN ls -al 

EXPOSE 9001

CMD ["yarn", "federated-hasura-dev"]
