const configuredNetwork = (process.env.NEXT_PUBLIC_CANTON_NETWORK || 'devnet').toLowerCase();

export const CANTON_CONFIG = {
  network: configuredNetwork.includes('mainnet') ? 'mainnet' : configuredNetwork.includes('testnet') ? 'testnet' : 'devnet',
  packageId: process.env.NEXT_PUBLIC_CANTON_PACKAGE_ID || '8300d64906ab73949a20f2b1ecbd07e55deb03f89b4bb9a6051c2c964beab4a5',
  packageName: process.env.NEXT_PUBLIC_CANTON_PACKAGE_NAME || 'nineja-trade',
  operatorParty: process.env.NEXT_PUBLIC_CANTON_OPERATOR_PARTY || '',
  financierParties: (process.env.NEXT_PUBLIC_CANTON_FINANCIER_PARTIES || '').split(',').map((party) => party.trim()).filter(Boolean),
  synchronizer: 'GlobalSynchronizer',
};
