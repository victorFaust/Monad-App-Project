# Monad MCP Interface (Minimal Version)

This is a minimal version of the Monad MCP Interface, designed to verify configuration and deployment settings.

## Features

- Verifies API endpoint configuration
- Checks RPC URL connectivity
- Displays current block number
- Shows environment variable status

## Getting Started

1. Clone this repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`
NEXT_PUBLIC_API_ENDPOINT=https://v0-break-down-ts-ixfmlfv4o-victorfausts-projects.vercel.app/api
NEXT_PUBLIC_MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
\`\`\`

## Deployment

This project is designed to be deployed on Vercel. Make sure to set the environment variables in your Vercel project settings.

## License

MIT
