/**
 * Email Template: Invoice Ready
 * Notifies customer when invoice is generated
 */

import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Section,
  Heading,
  Hr,
} from '@react-email/components';

interface InvoiceReadyProps {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  baseUrl: string;
}

export function InvoiceReady({
  invoiceId,
  invoiceNumber,
  customerName,
  invoiceDate,
  dueDate,
  totalAmount,
  baseUrl,
}: InvoiceReadyProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Invoice Ready</Heading>

          <Text style={text}>Hello {customerName},</Text>

          <Section style={highlightSection}>
            <Text style={highlightText}>
              Your invoice is ready for review and payment.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={detailsSection}>
            <Text style={detailLabel}>Invoice Number:</Text>
            <Text style={detailValue}>{invoiceNumber}</Text>

            <Text style={detailLabel}>Invoice Date:</Text>
            <Text style={detailValue}>{invoiceDate}</Text>

            <Text style={detailLabel}>Due Date:</Text>
            <Text style={detailValue}>{dueDate}</Text>

            <Text style={detailLabel}>Total Amount:</Text>
            <Text style={amountValue}>${totalAmount}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={buttonSection}>
            <Button
              href={`${baseUrl}/invoices/${invoiceId}`}
              style={button}
            >
              View Invoice
            </Button>
          </Section>

          <Section style={buttonSection}>
            <Button
              href={`${baseUrl}/invoices/${invoiceId}/download`}
              style={secondaryButton}
            >
              Download PDF
            </Button>
          </Section>

          <Text style={footer}>
            Please remit payment by the due date to avoid late fees. If you have any questions, please contact your sales representative.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  borderRadius: '8px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  padding: '0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 10px',
};

const highlightSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const highlightText = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const detailsSection = {
  margin: '20px 0',
};

const detailLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '12px 0 4px',
};

const detailValue = {
  color: '#1f2937',
  fontSize: '16px',
  margin: '0 0 12px',
};

const amountValue = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '15px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const secondaryButton = {
  backgroundColor: '#6b7280',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '20px 0 0',
  textAlign: 'center' as const,
};

export default InvoiceReady;
