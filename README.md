# 9jaTrade

9jaTrade reads trade contracts from Canton and submits Daml commands to the HackCanton DevNet JSON Ledger API. It does not use a browser wallet adapter to authenticate or sign Ledger API commands.

## Connect to HackCanton DevNet

1. Sign in to the [NODERS DevNet Wallet](https://wallet.validator.hackcanton-01.devnet.naas.noders.services) with your hackathon credentials. Select **Onboard yourself** and wait for allocation to finish. Copy the full party ID from the Wallet.
2. In the [NODERS Console](https://console.participant.hackcanton-01.devnet.naas.noders.services), sign in with Authfactory and confirm that your ledger user has `CanActAs` and `CanReadAs` on the party.
3. Generate a short-lived Ledger API access token:

   ```bash
   ./get_token.sh
   ```

   The script prompts for your HackCanton email and password, requests a Keycloak token with the `daml_ledger_api` scope, validates the response, and copies the `access_token` to your clipboard when `xclip`, `xsel`, or `wl-copy` is installed. If no clipboard tool is available, it prints the token in the terminal. The access token's `sub` must be your Ledger user ID and its audience must include `https://hackcanton-01.devnet.naas.noders.services`.
4. Copy `.env.example` to `.env.local` and configure the Canton values for the participant and DAR you are using. Party lists can be comma-, semicolon-, or newline-separated.
5. Build the matching DAR from `/home/bambo/my-project` with `daml build` and upload it to the same participant node using the Console. The package ID must match `NEXT_PUBLIC_CANTON_PACKAGE_ID`.
6. Run `npm run dev`, open `http://localhost:3000`, choose **Connect to Ledger**, then enter the copied party ID and paste only the access token's `access_token` value.

The app checks the token claims, reads `/v2/users/{sub}/rights`, verifies the party has both required rights, checks the configured package status, then loads active contracts visible to that party. It also reads unlocked Canton Coin (`Amulet`) holdings through the CIP-56 `HoldingV1` interface for the navbar balance. Commands use the Ledger API's `submit-and-wait-for-transaction` endpoint and the package-name template IDs (`#nineja-trade:Module:Template`) described in the Quickstart.

## Environment variables

Start from the example file:

```bash
cp .env.example .env.local
```

Useful `.env.local` keys:

```dotenv
# Server-side JSON Ledger API proxy target.
CANTON_LEDGER_JSON_API=https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services

# Daml package deployed to the same participant.
NEXT_PUBLIC_CANTON_PACKAGE_ID=8300d64906ab73949a20f2b1ecbd07e55deb03f89b4bb9a6051c2c964beab4a5
NEXT_PUBLIC_CANTON_PACKAGE_NAME=nineja-trade

# Parties allocated in the NODERS DevNet Wallet.
NEXT_PUBLIC_CANTON_OPERATOR_PARTY=<operator-party-id::1220...>
NEXT_PUBLIC_CANTON_FINANCIER_PARTIES=<financier-party-id::1220...>[,<another-financier-party-id::1220...>]

# Optional convenience keys for local notes or future integrations.
NEXT_PUBLIC_CANTON_LEDGER_JSON_API=https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services
NEXT_PUBLIC_CANTON_VALIDATOR_API=https://validator-api-http.validator.hackcanton-01.devnet.naas.noders.services
NEXT_PUBLIC_CANTON_NETWORK=devnet
```

`CANTON_LEDGER_JSON_API` is preferred because it stays server-side. `NEXT_PUBLIC_CANTON_LEDGER_JSON_API` is only used as a fallback by the local API route. Do not put access tokens, Keycloak passwords, or refresh tokens in `.env.local`; paste each fresh `access_token` into the app when connecting.

## End-to-end trade workflow

1. Connect the applicant party and submit its supplier, buyer, or financier company details at `/register`.
2. Registration remains pending until the party configured as `NEXT_PUBLIC_CANTON_OPERATOR_PARTY` connects with operator rights, opens `/register`, and approves the request. Applicants can return to the page and check the status; approval activates their company profile.
3. An approved supplier creates and submits an invoice to a buyer party. The buyer connects its own approved party, reviews the invoice, confirms the obligation, and records delivery evidence.
4. The supplier requests financing for a confirmed invoice. A financier whose party is included in `NEXT_PUBLIC_CANTON_FINANCIER_PARTIES` submits an offer; the supplier reviews and accepts an offer.
5. The financier records that funds were disbursed. When the buyer pays outside the app, the buyer records the payment reference and settlement allocation on Canton.

The supplier, buyer, and financier routes open the corresponding desk in the unified dashboard. The contract ID displayed for a pending registration is a ledger reference, not a party ID. Funding and settlement controls only record ledger state; they do not transfer Canton Coin, fiat, or other assets.

The short-lived access token and party ID are saved in the current tab's `sessionStorage` so a page reload can restore the connection. The app rechecks token validity, party rights, the DAR, and active contracts when restoring; expired or invalid sessions are cleared and require a fresh access token. Disconnecting or closing the tab clears the saved session. The app never requests or stores your Keycloak password or refresh token. `sessionStorage` is accessible to scripts running on this origin, so this local testing convenience is not a production authentication solution. For a production browser login/refresh flow, ask NODERS for an approved SPA integration as directed by the guide.

## Contract boundaries

Funding and settlement choices record agreement state, references, and allocation amounts; they do not transfer tokens or fiat. Transfers happen separately. Delivery confirmation hashes a selected document in the browser and records its supplied storage reference; the app does not upload documents.

## Development

- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm run lint` checks application source.
