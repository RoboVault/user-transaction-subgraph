## How to setup User-Transaction-Subgraph:

**Step 1:** Clone repo https://github.com/RoboVault/user-transaction-subgraph.git

**Step 2:** Create account in **The Graph**: https://thegraph.com/en/ and create your own Subgraph for local testing.

**Step 3:** Open root folder of the cloned repo.

**Step 4:** Run the following commands:

> **Install packages:**
`yarn`
`yarn global add @graphprotocol/graph-cli`

> **Generate codes and build subgraph:**
`graph codegen && graph build`

> **Authenticate:**
`graph auth --product hosted-service <insert: your_access_token>`

> **Deploy in your own Subgraph:**
`graph deploy --product hosted-service <insert: your_account_name>/<insert: your_subgraph_name>`

## How to redeploy after making changes

**Step 1:** Generate codes and build subgraph
`graph codegen && graph build`

**Step 2:** Deploy in your own Subgraph
`graph deploy --product hosted-service *<inser: your_account_name>/<insert: your_subgraph_name>*`

## How to query

**Step 1:** Copy the GraphQL Endpoint URL of your Subgraph

**Step 2:** Use this playground: https://cloud.hasura.io/public/graphiql

## Documentation

| Topic | README |
| ------ | ------ |
| Hosted Service | https://thegraph.com/docs/en/deploying/hosted-service/ |
| Deploy in Hosted Service | https://thegraph.com/docs/en/deploying/deploying-a-subgraph-to-hosted/ |