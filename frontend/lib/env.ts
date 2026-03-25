const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || '').toLowerCase();

export const isProductionApp = appEnv === 'production';
export const allowDemoUnlocks = !isProductionApp;
export const allowResetAssets = !isProductionApp;
