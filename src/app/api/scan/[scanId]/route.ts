/**
 * GET /api/scan/{scanId}
 *
 * Check scan status and get extraction results.
 * Client should poll this endpoint every 2-3 seconds until status is 'completed' or 'failed'.
 *
 * Response (processing):
 * {
 *   scanId: string,
 *   status: 'processing',
 *   createdAt: string
 * }
 *
 * Response (completed):
 * {
 *   scanId: string,
 *   status: 'completed',
 *   extractedData: { ... },
 *   completedAt: string
 * }
 *
 * Response (failed):
 * {
 *   scanId: string,
 *   status: 'failed',
 *   errorMessage: string
 * }
 *
 * ---
 *
 * POST /api/scan/{scanId}
 *
 * Create a customer from extracted business card or license data.
 *
 * Request:
 * {
 *   createCustomer: true
 * }
 *
 * Response:
 * {
 *   customerId: string,
 *   customer: { ... }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import type { BusinessCardData, LicenseData } from '@/lib/image-extraction';

const prisma = new PrismaClient();

interface RouteParams {
  params: {
    scanId: string;
  };
}

/**
 * GET - Check scan status and get results
 */
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { scanId } = params;

    const scan = await prisma.imageScan.findUnique({
      where: { id: scanId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      scanId: scan.id,
      status: scan.status,
      scanType: scan.scanType,
      extractedData: scan.extractedData,
      customerId: scan.customerId,
      customer: scan.customer,
      errorMessage: scan.errorMessage,
      createdAt: scan.createdAt,
      completedAt: scan.completedAt
    });

  } catch (error) {
    console.error('Get scan status failed:', error);

    return NextResponse.json(
      { error: 'Failed to retrieve scan status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create customer from extracted data
 */
export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { scanId } = params;
    const body = await req.json();

    if (!body.createCustomer) {
      return NextResponse.json(
        { error: 'Invalid request. Set createCustomer: true' },
        { status: 400 }
      );
    }

    // Get scan record
    const scan = await prisma.imageScan.findUnique({
      where: { id: scanId }
    });

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    if (scan.status !== 'completed') {
      return NextResponse.json(
        { error: 'Scan has not completed yet' },
        { status: 400 }
      );
    }

    if (scan.customerId) {
      return NextResponse.json(
        { error: 'Customer already created from this scan' },
        { status: 400 }
      );
    }

    // Create customer based on scan type
    let customer;

    if (scan.scanType === 'business_card') {
      const data = scan.extractedData as unknown as BusinessCardData;
      customer = await prisma.customer.create({
        data: {
          tenantId: scan.tenantId,
          name: data.company || data.name,
          billingEmail: data.email,
          phone: data.phone,
          street1: data.address
        }
      });
    } else if (scan.scanType === 'liquor_license') {
      const data = scan.extractedData as unknown as LicenseData;
      customer = await prisma.customer.create({
        data: {
          tenantId: scan.tenantId,
          name: data.businessName,
          street1: data.address,
          state: data.state
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Unknown scan type' },
        { status: 400 }
      );
    }

    // Link customer to scan
    await prisma.imageScan.update({
      where: { id: scanId },
      data: { customerId: customer.id }
    });

    return NextResponse.json({
      customerId: customer.id,
      customer
    });

  } catch (error) {
    console.error('Create customer from scan failed:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create customer'
      },
      { status: 500 }
    );
  }
}
