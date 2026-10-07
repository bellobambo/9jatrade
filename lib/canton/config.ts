function parseEnvList(value: string | undefined) {
  return (value ?? '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export const CANTON_CONFIG = {
  packageId: (process.env.NEXT_PUBLIC_CANTON_PACKAGE_ID || '8300d64906ab73949a20f2b1ecbd07e55deb03f89b4bb9a6051c2c964beab4a5').trim(),
  packageName: (process.env.NEXT_PUBLIC_CANTON_PACKAGE_NAME || 'nineja-trade').trim(),
  operatorParty: (process.env.NEXT_PUBLIC_CANTON_OPERATOR_PARTY || '').trim(),
  financierParties: parseEnvList(process.env.NEXT_PUBLIC_CANTON_FINANCIER_PARTIES),
};
