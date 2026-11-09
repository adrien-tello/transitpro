// SMS: NOT USED for now (no free SMS provider reaches Cameroon numbers).
// Codes and notices go by email (lib/email.ts). Kept so it can be switched on later
// if the project gets an SMS budget. It only prints to the console.
export async function sendSms(phone: string, message: string): Promise<void> {
  console.log(`[SMS to ${phone}] ${message}`);
}
