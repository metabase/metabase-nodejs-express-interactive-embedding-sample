# Metabase Node.js interactive embedding sample

This repo includes sample code referenced in the [quick start guide](https://www.metabase.com/learn/customer-facing-analytics/interactive-embedding-quick-start) for setting up interactive embedding with JWT.

You'll need a Pro or Enterprise version of Metabase up and running. If you're not sure where to start, sign up for [Pro Cloud](https://www.metabase.com/pricing).

## Set up your Metabase

### Create a dashboard

In the left nav, go to **Browse data** > **Sample Database**. Hover over the `Invoices` table and click on the lightning bolt to X-ray the table.

Click the button to **Save this** as a dashboard. Metabase will save this dashboard in the collection called "Automatically generated dashboards".

Visit that dashboard in the "Automatically generated dashboards" and make a note of its URL. If it's the first dashboard you created, it's probably `/dashboard/1` followed by a description.

### Enable SSO with JWT

From any Metabase page, click on the **gear** icon in the upper right and select **Admin Settings** > **Settings** > **Authentication**.

On the card that says **JWT**, click the **Setup** button.

### JWT Identity provider URI

In **JWT IDENTITY PROVIDER URI** field, paste  `localhost:8080/login`.

### String used by the JWT signing key

Click the **Generate key** button. Copy the key.

## Running the server

### Install packages

Run:

```sh
npm install
```

### Set environment variables

You'll need to set some environment variables for your server.

- [METABASE_SITE_URL](#metabase_site_url)
- [METABASE_JWT_SHARED_SECRET](#metabase_jwt_shared_secret)
- [METABASE_DASHBOARD_PATH](#)

### METBASE_SITE_URL

```sh
export METABASE_SITE_URL="https://myapp.metabaseapp.com"
```

Replacing "https://myapp.metabaseapp.com" with the root path of your Metabase.

### METABASE_JWT_SHARED_SECRET

```sh
export METABASE_JWT_SHARED_SECRET="COPY_SECRET_FROM_JWT_CONFIG"
```
You can get this key from your Metabase by clicking on the **gear** icon and going to **Admin Settings** > **Settings** > **Authentication** > **JWT**.

### METABASE_DASHBOARD_PATH

If the dashboard you created above doesn't have an ID of 1, you'll also need to update the path:

```sh
export METABASE_DASHBOARD_PATH=`/dashboard/id`
```

Replacing `id` with the ID number of your dashboard.

## Starting the app

Start the server by running:

```sh
node index.js
```

The app runs by default on port 8080. If you want to run it on a different port, set the `PORT` environment variable:
```sh
export PORT=8081
```


Visit [http://localhost:8080/analytics](localhost:8080/analytics) and sign in with the following credentials:

```sh
user: rene@example.com
password: foobar
```

## Set up groups and data sandboxing

Check out our [quick start guide](https://www.metabase.com/learn/customer-facing-analytics/interactive-embedding-quick-start) to set up interactive embedding with JWT and data sandboxing.

## Reporting issues

Please report bugs or feature requests as issues in this reporsitory. Please do not report security vulnerabilities on the public GitHub issue tracker. Our Security Policy describes [the procedure](https://github.com/metabase/metabase/security#reporting-a-vulnerability) for disclosing security issues.

## Author

[Metabase](https://metabase.com)

## License

This project is licensed under the MIT license. See the [LICENSE](./LICENSE) file for more info.
