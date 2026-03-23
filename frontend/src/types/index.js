// TypeScript interfaces converted to JSDoc comments for better documentation

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 * @property {string} email
 * @property {string} [playerID]
 * @property {string} [alertEmail]
 * @property {Object} [notification_preferences]
 * @property {number} notification_preferences.days_before_expiry
 */

/**
 * @typedef {Object} Product
 * @property {string} _id
 * @property {string} user_id
 * @property {string} product_name
 * @property {string} expiry_date
 * @property {string} [image_url]
 * @property {string} [barcode]
 * @property {'safe' | 'near' | 'expired'} status
 * @property {string} created_at
 */

/**
 * @typedef {Object} AuthResponse
 * @property {string} access_token
 * @property {string} token_type
 * @property {User} user
 */

/**
 * @typedef {Object} LoginData
 * @property {string} username
 * @property {string} password
 */

/**
 * @typedef {Object} SignupData
 * @property {string} username
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} AddProductData
 * @property {string} product_name
 * @property {string} expiry_date
 * @property {string} [barcode]
 * @property {string} [image_url]
 */

/**
 * @typedef {Object} Statistics
 * @property {number} total_items
 * @property {number} expiring_this_week
 * @property {number} expired_items
 * @property {number} items_added_this_month
 */

export {};