import nodemailer from "nodemailer";
import { configPath, getConfig } from "../config-path";
import { Status } from "./schema/type";

class PasswordReset {
  sendPasswordResetCode(resetCode: string, userEmail: string): Promise<Status> {
    return new Promise<Status>((resolve, _) => {
      const auth = nodemailer.createTransport({
        service: "gmail",
        secure: true,
        port: 465,
        auth: {
          user: getConfig(configPath.passwordReset.email),
          pass: getConfig(configPath.passwordReset.appPassword),
        },
      });

      const receiver = {
        from: getConfig(configPath.passwordReset.email),
        to: userEmail,
        subject: "Password Reset Code",
        text: `Your reset code: ${resetCode}`,
      };

      auth.sendMail(receiver, (error: any, emailResponse: any) => {
        resolve(error ? Status.FAILURE : Status.SUCCESS);
      });
    });
  }
}

const passwordResetClient = new PasswordReset();

export default passwordResetClient;
