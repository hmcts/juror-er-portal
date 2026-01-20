# ---- Base image ----
FROM hmctspublic.azurecr.io/base/node:20-alpine as base
COPY package.json yarn.lock ./

USER root
RUN corepack enable
USER hmcts

COPY --chown=hmcts:hmcts . .
RUN yarn install

# ---- Build image ----
FROM base as build

RUN yarn build:prod && \
    rm -rf webpack/ webpack.config.js

# ---- Runtime image ----
FROM base as runtime

COPY --from=build $WORKDIR/src/main ./src/main
# TODO: expose the right port for your application
EXPOSE 3000
