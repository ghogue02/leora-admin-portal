/**
 * Email Template: Order Status Changed
 * Notifies customer when order status changes
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

interface OrderStatusChangedProps {
  orderId: string;
  orderNumber: string;
  customerName: string;
  previousStatus: string;
  newStatus: string;
  orderDate: string;
  totalAmount: string;
  baseUrl: string;
}

export function OrderStatusChanged({
  orderId,
  orderNumber,
  customerName,
  previousStatus,
  newStatus,
  orderDate,
  totalAmount,
  baseUrl,
}: OrderStatusChangedProps) {
  const statusMessages: Record<string, string> = {
    SUBMITTED: 'Your order has been received and is being processed.',
    PICKED: 'Your order has been picked and is ready for delivery.',
    READY_TO_DELIVER: 'Your order is ready for delivery.',
    DELIVERED: 'Your order has been delivered.',
    CANCELLED: 'Your order has been cancelled.',
  };

  const statusMessage = statusMessages[newStatus] || 'Your order status has been updated.';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Order Status Update</Heading>

          <Text style={text}>Hello {customerName},</Text>

          <Section style={statusSection}>
            <Text style={statusText}>
              {statusMessage}
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={detailsSection}>
            <Text style={detailLabel}>Order Number:</Text>
            <Text style={detailValue}>{orderNumber}</Text>

            <Text style={detailLabel}>Order Date:</Text>
            <Text style={detailValue}>{orderDate}</Text>

            <Text style={detailLabel}>Total Amount:</Text>
            <Text style={detailValue}>${totalAmount}</Text>

            <Text style={detailLabel}>Status:</Text>
            <Text style={detailValue}>
              <span style={statusBadge}>{newStatus.replace(/_/g, ' ')}</span>
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={buttonSection}>
            <Button
              href={`${baseUrl}/sales/orders/${orderId}`}
              style={button}
            >
              View Order Details
            </Button>
          </Section>

          <Text style={footer}>
            If you have any questions, please contact your sales representative.
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

const statusSection = {
  backgroundColor: '#dbeafe',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const statusText = {
  color: '#1e40af',
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

const statusBadge = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  padding: '4px 12px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '30px 0',
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

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '20px 0 0',
  textAlign: 'center' as const,
};

export default OrderStatusChanged;
