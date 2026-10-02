'use client';

import { createPartyLayer, type PartyLayerClient } from '@partylayer/sdk';
import { CANTON_CONFIG } from './config';

let cantonClient: PartyLayerClient | null = null;

export function getCantonClient() {
    if (typeof window === 'undefined') throw new Error('Canton wallet access is only available in the browser.');
    cantonClient ??= createPartyLayer({
        network: CANTON_CONFIG.network,
        networkEnforcement: 'strict',
        app: { name: '9jaTrade' },
    });
    return cantonClient;
}