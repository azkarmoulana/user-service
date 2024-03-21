import twilio from "twilio";

const accountSid = "AC7df600f7fafae946bfb9ac2be92f3853";
const authToken = "8feffd7af8df01cde419ea3f27a5f3d4";

const client = twilio(accountSid, authToken);

export const GenereateVerificationCode = () => {
  const code = Math.floor(10000 + Math.random() * 900000);
  let expiry = new Date();
  expiry.setTime(new Date().getTime() + 30 * 60 * 1000);
  return { code, expiry };
};

export const SendVerificationCode = async (
  code: number,
  toPhoneNumber: string
) => {
  //   const response = await client.messages.create({
  //     body: `Your verification code is: ${code}`,
  //     from: "+31626125399",
  //     // to: toPhoneNumber.trim(),
  //     to: "+31684155966",
  //   });
  console.log("code is : ", code);
  //   console.log(response);
  return code;
};
