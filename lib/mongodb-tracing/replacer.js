const blacklist = [
  // Passwords
  'password',
  'hashed_password',
  'pwd',
  'secret',
  'tempSecret',
  'keys',
  'passwd',
  // Keys
  'api_key',
  'apikey',
  'token',
  'mysql_pwd',
  'credentials',
  'stripetoken',
  // OAuth2
  'access_token',
  'accessToken',
  'auth_token',
  'authToken',
  'authorizationCode',
  'authorization_code',
  'refreshToken',
  'refresh_token',
  'clientSecret',
  'client_secret',
  // Personal information
  'firstName',
  'lastName'
]

function replacer(key, value) {
  if (typeof value === 'string' && blacklist.includes(key)) {
    return '[redacted]'
  }
  return value
}

module.exports = replacer
