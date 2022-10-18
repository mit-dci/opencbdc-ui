module.exports = {
    postgres: {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'wallet_dev',
        user: process.env.DB_USER || 'wallet_admin',
        password: process.env.DB_PASSWORD || 'super-secret-password',
        port: process.env.DB_PORT || 5432,
        ssl: false,
        debug: false
    },
    bankUrls: {
        bankB: 'http://localhost:9002/api/'
    },
    sentinel: {
        host: process.env.SNTL_HOST,
        port: process.env.SNTL_PORT
    }
}