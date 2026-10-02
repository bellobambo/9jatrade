## Canton Setup

The app uses PartyLayer over CIP-0103 for DevNet wallet discovery, party identity, signed Daml commands, and party-scoped Ledger API reads. Trade contracts and company profiles are loaded from Canton; the browser store is only a transient view cache.

1. Configure the public Canton values from `.env.example` in `.env.local`:
	- `NEXT_PUBLIC_CANTON_NETWORK=devnet`
	- `NEXT_PUBLIC_CANTON_PACKAGE_ID` must match the DAR deployed to the connected Canton network. The checked-in default matches `nineja-trade-1.0.0.dar` in `/home/bambo/my-project/.daml/dist`.
	- `NEXT_PUBLIC_CANTON_OPERATOR_PARTY` must be the real allocated operator Party ID. It is recorded in each registration request and controls approval.
	- `NEXT_PUBLIC_CANTON_FINANCIER_PARTIES` is a comma-separated list of real allocated financier Party IDs. Those parties are observers on financing requests.
2. Deploy the matching DAR to the same Canton network used by the wallet.
3. Connect a DevNet wallet that supports signed commands and Ledger API reads. The app does not accept typed or generated Party IDs as authentication.
4. Run `npm run dev` and open `http://localhost:3000`.

Applicants submit a `RegistrationRequest` from their wallet party. An operator wallet approves it to create the `CompanyProfile` used by the trade dashboard.

## Contract Boundaries

Funding and settlement choices record agreement state, references, and allocation amounts; they do not transfer tokens or fiat. Transfers must happen separately. Delivery confirmation hashes a selected document in the browser and records its supplied storage reference; the app does not upload documents.

For deployment, run `npm run build`. `npm run lint` checks the application source.
