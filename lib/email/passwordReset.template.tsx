// lib/email/passwordReset.template.tsx
// React Email template for password reset emails.
// QuackCoin branding: charcoal background, gold CTA button.

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

interface PasswordResetEmailProps {
  resetLink: string;
  expiryMinutes?: number;
}

export function PasswordResetEmail({
  resetLink,
  expiryMinutes = 60,
}: PasswordResetEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`Reset your QuackCoin password — link valid for ${expiryMinutes} minutes`}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>🦆 QuackCoin</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={heading}>Reset your password</Text>
            <Text style={paragraph}>
              We received a request to reset the password for your QuackCoin account.
              Click the button below to set a new password.
            </Text>
            <Text style={paragraph}>
              This link will expire in {expiryMinutes} minutes.
            </Text>

            <Section style={buttonContainer}>
              <Button href={resetLink} style={ctaButton}>
                Reset Password
              </Button>
            </Section>

            <Text style={paragraph}>
              If you did not request a password reset, you can safely ignore this email.
              Your password will not be changed.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              For security reasons, this link can only be used once.
              If you need help, contact support@quackcoin.app
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ────────────────────────────────────────────────────
const body = {
  backgroundColor: "#1C1917",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const container = {
  maxWidth: "560px",
  margin: "40px auto",
  borderRadius: "8px",
  overflow: "hidden",
  border: "1px solid #44403C",
};

const header = {
  backgroundColor: "#292524",
  padding: "24px 32px",
  borderBottom: "1px solid #44403C",
};

const logoText = {
  color: "#FAFAF9",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0",
};

const content = {
  backgroundColor: "#292524",
  padding: "32px",
};

const heading = {
  color: "#FAFAF9",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 16px",
};

const paragraph = {
  color: "#A8A29E",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const buttonContainer = {
  margin: "24px 0",
  textAlign: "center" as const,
};

const ctaButton = {
  backgroundColor: "#D4AF37",
  color: "#1C1917",
  padding: "12px 28px",
  borderRadius: "6px",
  fontWeight: "600",
  fontSize: "15px",
  textDecoration: "none",
  display: "inline-block",
};

const hr = {
  borderColor: "#44403C",
  margin: "24px 0 16px",
};

const footer = {
  color: "#78716C",
  fontSize: "13px",
  lineHeight: "1.5",
};
