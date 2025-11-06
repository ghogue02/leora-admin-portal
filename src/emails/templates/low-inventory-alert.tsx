/**
 * Email Template: Low Inventory Alert
 * Notifies sales reps when inventory is low
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

interface InventoryItem {
  productName: string;
  skuCode: string;
  currentQuantity: number;
  reorderPoint: number;
  recommendedOrder: number;
}

interface LowInventoryAlertProps {
  salesRepName: string;
  items: InventoryItem[];
  baseUrl: string;
}

export function LowInventoryAlert({
  salesRepName,
  items,
  baseUrl,
}: LowInventoryAlertProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Low Inventory Alert</Heading>

          <Text style={text}>Hello {salesRepName},</Text>

          <Section style={alertSection}>
            <Text style={alertText}>
              {items.length} product{items.length !== 1 ? 's are' : ' is'} running low on inventory.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={itemsSection}>
            <Text style={sectionHeading}>Products Requiring Attention:</Text>

            {items.map((item, index) => (
              <Section key={index} style={itemCard}>
                <Text style={productName}>{item.productName}</Text>
                <Text style={itemDetail}>
                  SKU: <span style={itemValue}>{item.skuCode}</span>
                </Text>
                <Text style={itemDetail}>
                  Current Quantity: <span style={lowValue}>{item.currentQuantity}</span>
                </Text>
                <Text style={itemDetail}>
                  Reorder Point: <span style={itemValue}>{item.reorderPoint}</span>
                </Text>
                <Text style={itemDetail}>
                  Recommended Order: <span style={itemValue}>{item.recommendedOrder} units</span>
                </Text>
              </Section>
            ))}
          </Section>

          <Hr style={hr} />

          <Section style={buttonSection}>
            <Button
              href={`${baseUrl}/inventory/alerts`}
              style={button}
            >
              View All Alerts
            </Button>
          </Section>

          <Section style={buttonSection}>
            <Button
              href={`${baseUrl}/inventory/purchase-orders/new`}
              style={secondaryButton}
            >
              Create Purchase Order
            </Button>
          </Section>

          <Text style={footer}>
            Please review these items and take appropriate action to avoid stockouts.
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

const alertSection = {
  backgroundColor: '#fef2f2',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const alertText = {
  color: '#991b1b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const itemsSection = {
  margin: '20px 0',
};

const sectionHeading = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const itemCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '16px',
  margin: '0 0 12px',
  borderLeft: '4px solid #ef4444',
};

const productName = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const itemDetail = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '4px 0',
};

const itemValue = {
  color: '#1f2937',
  fontWeight: '600',
};

const lowValue = {
  color: '#dc2626',
  fontWeight: '600',
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

export default LowInventoryAlert;
