import nodemailer from 'nodemailer'
import { google } from 'googleapis'

const OAuth2 = google.auth.OAuth2

const createTransporter = async () => {
    const oauth2Client = new OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
    )

    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    })

    // Get access token
    const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
            if (err) {
                console.error('Failed to create access token', err)
                reject('Failed to create access token')
            }
            resolve(token)
        })
    })

    const transporter = nodemailer.createTransport({
        // @ts-ignore
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.GMAIL_USER,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken: accessToken as string,
        },
    })

    return transporter
}

export const sendEmail = async ({
    to,
    subject,
    html,
    text,
}: {
    to: string | string[]
    subject: string
    html?: string
    text?: string
}) => {
    try {
        const transporter = await createTransporter()

        const mailOptions = {
            from: `Hospital Management System <${process.env.GMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('Message sent: %s', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('Error sending email:', error)
        return { success: false, error: 'Failed to send email' }
    }
}
