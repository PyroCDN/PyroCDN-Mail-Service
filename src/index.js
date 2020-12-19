require('dotenv').config()
const nodemailer = require('nodemailer')
const express = require('express')
const bodyParser = require('body-parser')

/**
 * Setup mail server
 */
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
})

const connect = () => {
  transporter.verify(async err => {
    // Wait 5s and reconnect on error
    if(err) {
      await (new Promise(resolve => {
        setTimeout(resolve, 5000)
      }))
      console.log('[SERVICE] Mail failed to connect.')
      return connect()
    }
    console.log('[SERVICE] Mail ready')
  })
}
// Verify connection
connect()

const sendMail = (to, from, subject, text, html) => {
  console.log(`[SERVICE] Sending verification mail to ( ${to} )`)
  return transporter.sendMail({
    from: from,
    to,
    subject,
    text,
    html
  })
}

const mailQueue = []

// Mail queue handler
setInterval(async () => {
  if(mailQueue.length > 0) {
    for(let i = 0; i < mailQueue.length; i++) {
      const { to, from, subject, text, html } = mailQueue[i]
      sendMail(to, from, subject, text, html).then(() => {
        console.log(`[SERVICE] Verification mail to ( ${to} ) sent.`)
        // Remove item from queue
        mailQueue.splice(mailQueue.indexOf(i), 1)
      }).catch((r) => {
        console.log(`[SERVICE] Verification mail to ( ${to} ) failed. Retrying in 5s...`)
      })
    }
  }
}, 5000)

/**
 * Setup API
 */
const app = express()
app.use(bodyParser.json())

app.post('/send', (req, res) => {
  if(req.headers.authorization === process.env.API_AUTH_HEADER) {
    const { to, from, subject, text, html } = req.body
    mailQueue.push({
      to: to,
      from: from,
      subject: subject,
      text: text,
      html: html
    })
    return res.status(200).send('OK')
  } else return res.status(403).send('Unauthorized')
})

app.get('/metrics', (req, res) => {
  res.status(200).send(`in_queue ${mailQueue.length}`)
})

app.listen(process.env.API_PORT, process.env.API_HOST)