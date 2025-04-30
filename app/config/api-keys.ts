interface ApiKey {
    name: string;
    active: boolean;
    createdAt: string;
}

interface ApiKeys {
    [key: string]: ApiKey;
}

// In production, these should be stored in environment variables
export const API_KEYS: ApiKeys = {
    'mob_auth_102938u102938120398210938': {
        name: 'Default API Key',
        active: true,
        createdAt: new Date().toISOString()
    }
};

export function isValidApiKey(key: string): boolean {
    return key in API_KEYS && API_KEYS[key].active;
} 