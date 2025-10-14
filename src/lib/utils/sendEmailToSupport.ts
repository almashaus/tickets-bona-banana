export const sendEmailToSupport = (
  paymentId: string,
  email: string
): string => {
  const subject = encodeURIComponent(
    `Payment Issue | Payment Id: ${paymentId}`
  );
  const body = encodeURIComponent(
    `Hello,\n\nI need help with my payment in Bona Banana, my account is ${email}\n\n\nThank you.`
  );
  const mailtoLink = `mailto:info@bona-banana.com?subject=${subject}&body=${body}`;

  return mailtoLink;
};
