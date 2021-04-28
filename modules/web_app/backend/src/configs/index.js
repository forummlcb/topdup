require('dotenv').config()
export const secretKey = 'topdup.xyz';
export const externalAuthUrl = {
  fb: 'https://graph.facebook.com/v7.0',
  gg: 'https://www.googleapis.com/oauth2/v3'
}
export const hostName = process.env.url || "topdup.xyz"

console.log("Host MailServe: " + hostName)

export const emailServer = {
  user: process.env.WEB_EMAIL,
  pass: process.env.WEB_EMAIL_PASS
}
