// SMS sending. For now it only prints to the console so the team can test
// without paying for an SMS provider. Later: Twilio or a local gateway.
export async function sendSms(phone: string, message: string): Promise<void> {
  console.log(`[SMS to ${phone}] ${message}`);
}
