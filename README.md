# Metabase Node.js Interactive Embedding Sample

This is the sample code for the Metabase Node.js Interactive Embedding Quickstart.

Please check out the code for an example of how to integrate interactive embedding into your Node.js applications.

## What is Metabase?

## Running the sample code
1. Make sure you have updated enabled JWT for SSO under admin settings, and you have entered your app's SSO endpoint as the JWT Identity Provider URI. The path is `/sso/metabase`, e.g. `http://localhost:8080/sso/`metabase
2. Make sure you define the following env vars defined:
** `export METABASE_SITE_URL="https://myapp.metabaseapp.com"` - the root path of your Metabase instance,
** `export METABASE_JWT_SHARED_SECRET="COPY_SECRET_FROM_JWT_CONFIG"` - you grab this from the SSO JWT config in admin settings
3. Create a dashboard using X-ray on the invoices table in the sample dataset. If the ID is not 1, then update `METABASE_DASHBOARD_PATH` in `index.js`.  
3. Start the sample with `node index.js`. It runs by default on port 8080.
4. Hit http://localhost:8080, sign in and hit `/analytics` with both users to populate them to Metabase.
5. Create groups `Customer Acme` and `Customer Fake` and configure permissions so they can access the collection in which the dashboard is located. Also, setup data sandboxing on the Invoices table filtering on `accountId`.
6. Under SSO then activate group membership syncing and map `Customer-Acme` and `Customer-Fake` to the groups you've created.
7. You should be able to sign in with the two users and see the dashboard. If not, check the collection permissions for their respective groups.
8. Both users should be able to see the same dashboard but with different data, beacuse of sandboxing.

## Create a free Metabase trial

* For interactive embedding, you will need a Pro or Enterprise plan.
* You can sign up for a free trial at https://store.metabase.com/checkout

## Reporting issues

Please report bugs or feature requests as issues in this reporsitory. Please do not report security vulnerabilities on the public GitHub issue tracker. Our Security Policy describes [the procedure](https://github.com/metabase/metabase/security#reporting-a-vulnerability) for disclosing security issues.

## Author

[Metabase](https://metabase.com)

## License

This project is licensed under the MIT license. See the [LICENSE](./LICENSE) file for more info.