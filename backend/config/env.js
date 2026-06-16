const splitCsv = (value) => {
    if (!value) return [];
    return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
};

const required = (name) => {
    const value = process.env[name];
    if (value) return value;
    throw new Error(`Missing required environment variable: ${name}`);
};

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT || 5050),
    mongodbUri: required('MONGODB_URI'),
    corsOrigins: splitCsv(process.env.CORS_ORIGIN || process.env.CORS_ORIGINS),
    adminPassword: required('ADMIN_PASSWORD'),
    adminToken: required('ADMIN_TOKEN')
};
