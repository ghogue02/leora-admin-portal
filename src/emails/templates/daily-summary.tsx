/**
 * Email Template: Daily Summary
 * Sends daily summary to sales reps
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

interface DailySummaryProps {
  salesRepName: string;
  date: string;
  metrics: {
    ordersCount: number;
    ordersTotal: string;
    newCustomers: number;
    activitiesCompleted: number;
    tasksCompleted: number;
    tasksPending: number;
  };
  topOrders: Array<{
    orderNumber: string;
    customerName: string;
    totalAmount: string;
  }>;
  upcomingTasks: Array<{
    title: string;
    dueDate: string;
    priority: string;
  }>;
  baseUrl: string;
}

export function DailySummary({
  salesRepName,
  date,
  metrics,
  topOrders,
  upcomingTasks,
  baseUrl,
}: DailySummaryProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Daily Summary - {date}</Heading>

          <Text style={text}>Hello {salesRepName},</Text>

          <Text style={text}>
            Here's your daily summary of activity and performance.
          </Text>

          <Hr style={hr} />

          <Section style={metricsSection}>
            <Text style={sectionHeading}>Today's Metrics</Text>

            <Section style={metricsGrid}>
              <Section style={metricCard}>
                <Text style={metricValue}>{metrics.ordersCount}</Text>
                <Text style={metricLabel}>Orders</Text>
              </Section>

              <Section style={metricCard}>
                <Text style={metricValue}>${metrics.ordersTotal}</Text>
                <Text style={metricLabel}>Total Revenue</Text>
              </Section>

              <Section style={metricCard}>
                <Text style={metricValue}>{metrics.newCustomers}</Text>
                <Text style={metricLabel}>New Customers</Text>
              </Section>

              <Section style={metricCard}>
                <Text style={metricValue}>{metrics.activitiesCompleted}</Text>
                <Text style={metricLabel}>Activities</Text>
              </Section>
            </Section>
          </Section>

          <Hr style={hr} />

          {topOrders.length > 0 && (
            <>
              <Section style={ordersSection}>
                <Text style={sectionHeading}>Top Orders Today</Text>

                {topOrders.map((order, index) => (
                  <Section key={index} style={orderCard}>
                    <Text style={orderNumber}>{order.orderNumber}</Text>
                    <Text style={orderCustomer}>{order.customerName}</Text>
                    <Text style={orderAmount}>${order.totalAmount}</Text>
                  </Section>
                ))}
              </Section>

              <Hr style={hr} />
            </>
          )}

          {upcomingTasks.length > 0 && (
            <>
              <Section style={tasksSection}>
                <Text style={sectionHeading}>
                  Upcoming Tasks ({metrics.tasksPending} pending)
                </Text>

                {upcomingTasks.map((task, index) => (
                  <Section key={index} style={taskCard}>
                    <Text style={taskTitle}>{task.title}</Text>
                    <Text style={taskDue}>
                      Due: {task.dueDate}
                      <span style={getPriorityStyle(task.priority)}>
                        {' '}{task.priority}
                      </span>
                    </Text>
                  </Section>
                ))}
              </Section>

              <Hr style={hr} />
            </>
          )}

          <Section style={buttonSection}>
            <Button
              href={`${baseUrl}/dashboard`}
              style={button}
            >
              View Full Dashboard
            </Button>
          </Section>

          <Text style={footer}>
            Keep up the great work! Check your dashboard for more details.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Helper function for priority styles
function getPriorityStyle(priority: string) {
  const styles: Record<string, any> = {
    HIGH: { color: '#dc2626', fontWeight: '600' },
    MEDIUM: { color: '#f59e0b', fontWeight: '600' },
    LOW: { color: '#10b981', fontWeight: '600' },
  };
  return styles[priority] || { color: '#6b7280', fontWeight: '600' };
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

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const metricsSection = {
  margin: '20px 0',
};

const sectionHeading = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const metricsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '12px',
};

const metricCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '16px',
  textAlign: 'center' as const,
};

const metricValue = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const metricLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const ordersSection = {
  margin: '20px 0',
};

const orderCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '0 0 8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const orderNumber = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const orderCustomer = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '4px 0 0',
};

const orderAmount = {
  color: '#10b981',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const tasksSection = {
  margin: '20px 0',
};

const taskCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '0 0 8px',
};

const taskTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
};

const taskDue = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
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

export default DailySummary;
