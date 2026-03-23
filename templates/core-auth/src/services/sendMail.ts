import nodemailer, { type Transporter } from "nodemailer";
import { ResendTransport } from "@documenso/nodemailer-resend";
import { createTransport } from "nodemailer";
import { envConfig } from "../config/config.js";

// Email configurations optimized for Render.com deployment (and similar platforms)
const emailConfigs = {
  resend: {
    createTransport: (): Transporter =>
      createTransport(
        ResendTransport.makeTransport({
          apiKey: envConfig.resend_api_key || ""
        })
      )
  },
  gmail: {
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: envConfig.email,
      pass: envConfig.password
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    pool: false,
    maxConnections: 1,
    maxMessages: 1,
    rateDelta: 5000,
    rateLimit: 1
  },
  mailgun: {
    host: "smtp.mailgun.org",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAILGUN_SMTP_USER || envConfig.email,
      pass: process.env.MAILGUN_SMTP_PASSWORD || envConfig.password
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    pool: false,
    maxConnections: 1,
    maxMessages: 1
  }
};

interface IData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const sendMail = async (data: IData, retries: number = 2): Promise<boolean> => {
  // Determine environment and provider priority
  const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER;
  const providers: Array<"resend" | "gmail" | "mailgun"> = isProduction
    ? ["resend"]
    : ["resend", "gmail", "mailgun"];

  for (const provider of providers) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const transporter: Transporter =
          provider === "resend"
            ? emailConfigs.resend.createTransport()
            : nodemailer.createTransport(provider === "gmail" ? emailConfigs.gmail : emailConfigs.mailgun);

        // Skip connection verification for Resend to avoid timeout issues
        if (provider !== "resend") {
          await transporter.verify();
        }

        const mailOptions = {
          from:
            provider === "resend"
              ? envConfig.resend_from || "noreply@yourdomain.com"
              : envConfig.email,
          to: data.to,
          subject: data.subject,
          text: data.text,
          html: data.html,
          requireTLS: provider !== "resend",
          secure: provider === "gmail"
        };

        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Email sending timeout")), 25000)
        );

        await Promise.race([sendPromise, timeoutPromise]);
        transporter.close();
        return true;
      } catch (error: any) {
        console.error(
          `Email sending via ${provider} failed (attempt ${attempt}/${retries}):`,
          error?.message || error
        );

        // If this is the last attempt for the last provider, fail completely
        if (attempt === retries && provider === providers[providers.length - 1]) return false;

        // Otherwise retry with backoff
        if (attempt < retries) {
          const waitTime = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }
  }

  return false;
};

export default sendMail;

