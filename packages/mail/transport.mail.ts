import { MailConfig } from "@config";
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport(MailConfig);

export const transporter = transport;
