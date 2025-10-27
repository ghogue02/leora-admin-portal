import { db } from '../db';

export enum LeadSource {
  REFERRAL = 'referral',
  COLD_CALL = 'cold_call',
  EVENT = 'event',
  WEBSITE = 'website',
  SOCIAL_MEDIA = 'social_media',
  PARTNER = 'partner',
  OTHER = 'other'
}

export enum InterestLevel {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}

export enum FunnelStage {
  LEAD = 'lead',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

export interface Lead {
  id: string;
  tenantId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  leadSource: LeadSource;
  interestLevel: InterestLevel;
  estimatedValue?: number;
  productsInterested?: string[];
  assignedRepId?: string;
  currentStage: FunnelStage;
  notes?: string;
  convertedToCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadStageHistory {
  id: string;
  leadId: string;
  stage: FunnelStage;
  enteredAt: Date;
  exitedAt?: Date;
  movedBy: string;
  notes?: string;
  winLossReason?: string;
}

export interface PipelineMetrics {
  totalLeads: number;
  totalValue: number;
  weightedValue: number;
  conversionRates: {
    leadToQualified: number;
    qualifiedToProposal: number;
    proposalToClosedWon: number;
    overallWinRate: number;
  };
  averageTimeInStage: {
    [key in FunnelStage]?: number;
  };
  averageDaysToClose: number;
}

export class LeadModel {
  static async create(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    const id = crypto.randomUUID();
    const now = new Date();

    const newLead: Lead = {
      ...lead,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await db.execute(
      `INSERT INTO leads (id, tenant_id, company_name, contact_name, email, phone,
        lead_source, interest_level, estimated_value, products_interested,
        assigned_rep_id, current_stage, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newLead.id,
        newLead.tenantId,
        newLead.companyName,
        newLead.contactName,
        newLead.email,
        newLead.phone,
        newLead.leadSource,
        newLead.interestLevel,
        newLead.estimatedValue,
        JSON.stringify(newLead.productsInterested || []),
        newLead.assignedRepId,
        newLead.currentStage,
        newLead.notes,
        newLead.createdAt.toISOString(),
        newLead.updatedAt.toISOString(),
      ]
    );

    // Create initial stage history
    await this.createStageHistory({
      leadId: newLead.id,
      stage: newLead.currentStage,
      movedBy: newLead.assignedRepId || 'system',
      notes: 'Lead created',
    });

    return newLead;
  }

  static async findById(id: string, tenantId: string): Promise<Lead | null> {
    const result = await db.execute(
      'SELECT * FROM leads WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToLead(result.rows[0]);
  }

  static async findAll(tenantId: string, filters?: {
    stage?: FunnelStage;
    assignedRepId?: string;
    leadSource?: LeadSource;
    interestLevel?: InterestLevel;
    search?: string;
  }): Promise<Lead[]> {
    let query = 'SELECT * FROM leads WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (filters?.stage) {
      query += ' AND current_stage = ?';
      params.push(filters.stage);
    }

    if (filters?.assignedRepId) {
      query += ' AND assigned_rep_id = ?';
      params.push(filters.assignedRepId);
    }

    if (filters?.leadSource) {
      query += ' AND lead_source = ?';
      params.push(filters.leadSource);
    }

    if (filters?.interestLevel) {
      query += ' AND interest_level = ?';
      params.push(filters.interestLevel);
    }

    if (filters?.search) {
      query += ' AND (company_name LIKE ? OR contact_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.execute(query, params);
    return result.rows.map(this.mapRowToLead);
  }

  static async update(id: string, tenantId: string, updates: Partial<Lead>): Promise<Lead | null> {
    const current = await this.findById(id, tenantId);
    if (!current) return null;

    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'tenantId' && key !== 'createdAt') {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = ?`);

        if (key === 'productsInterested') {
          params.push(JSON.stringify(value));
        } else if (value instanceof Date) {
          params.push(value.toISOString());
        } else {
          params.push(value);
        }
      }
    });

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id, tenantId);

    await db.execute(
      `UPDATE leads SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
      params
    );

    return this.findById(id, tenantId);
  }

  static async updateStage(
    id: string,
    tenantId: string,
    newStage: FunnelStage,
    movedBy: string,
    notes?: string,
    winLossReason?: string
  ): Promise<Lead | null> {
    const lead = await this.findById(id, tenantId);
    if (!lead) return null;

    const oldStage = lead.currentStage;

    // Close previous stage history
    await db.execute(
      'UPDATE lead_stage_history SET exited_at = ? WHERE lead_id = ? AND exited_at IS NULL',
      [new Date().toISOString(), id]
    );

    // Create new stage history
    await this.createStageHistory({
      leadId: id,
      stage: newStage,
      movedBy,
      notes,
      winLossReason,
    });

    // Update lead
    return this.update(id, tenantId, { currentStage: newStage });
  }

  static async convertToCustomer(id: string, tenantId: string, customerId: string): Promise<Lead | null> {
    return this.update(id, tenantId, {
      convertedToCustomerId: customerId,
      currentStage: FunnelStage.CLOSED_WON,
    });
  }

  static async createStageHistory(history: Omit<LeadStageHistory, 'id' | 'enteredAt'>): Promise<void> {
    const id = crypto.randomUUID();
    const enteredAt = new Date();

    await db.execute(
      `INSERT INTO lead_stage_history (id, lead_id, stage, entered_at, moved_by, notes, win_loss_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, history.leadId, history.stage, enteredAt.toISOString(), history.movedBy, history.notes, history.winLossReason]
    );
  }

  static async getStageHistory(leadId: string): Promise<LeadStageHistory[]> {
    const result = await db.execute(
      'SELECT * FROM lead_stage_history WHERE lead_id = ? ORDER BY entered_at ASC',
      [leadId]
    );

    return result.rows.map(row => ({
      id: row.id as string,
      leadId: row.lead_id as string,
      stage: row.stage as FunnelStage,
      enteredAt: new Date(row.entered_at as string),
      exitedAt: row.exited_at ? new Date(row.exited_at as string) : undefined,
      movedBy: row.moved_by as string,
      notes: row.notes as string,
      winLossReason: row.win_loss_reason as string,
    }));
  }

  static async getPipelineMetrics(tenantId: string, filters?: {
    assignedRepId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PipelineMetrics> {
    let query = 'SELECT * FROM leads WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (filters?.assignedRepId) {
      query += ' AND assigned_rep_id = ?';
      params.push(filters.assignedRepId);
    }

    if (filters?.startDate) {
      query += ' AND created_at >= ?';
      params.push(filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query += ' AND created_at <= ?';
      params.push(filters.endDate.toISOString());
    }

    const result = await db.execute(query, params);
    const leads = result.rows.map(this.mapRowToLead);

    // Calculate metrics
    const totalLeads = leads.length;
    const totalValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);

    // Calculate weighted value (probability-weighted pipeline)
    const stageWeights: Record<FunnelStage, number> = {
      [FunnelStage.LEAD]: 0.1,
      [FunnelStage.QUALIFIED]: 0.25,
      [FunnelStage.PROPOSAL]: 0.5,
      [FunnelStage.NEGOTIATION]: 0.75,
      [FunnelStage.CLOSED_WON]: 1.0,
      [FunnelStage.CLOSED_LOST]: 0,
    };

    const weightedValue = leads.reduce((sum, lead) => {
      const weight = stageWeights[lead.currentStage] || 0;
      return sum + (lead.estimatedValue || 0) * weight;
    }, 0);

    // Calculate conversion rates
    const leadCount = leads.filter(l => l.currentStage === FunnelStage.LEAD).length;
    const qualifiedCount = leads.filter(l =>
      [FunnelStage.QUALIFIED, FunnelStage.PROPOSAL, FunnelStage.NEGOTIATION, FunnelStage.CLOSED_WON].includes(l.currentStage)
    ).length;
    const proposalCount = leads.filter(l =>
      [FunnelStage.PROPOSAL, FunnelStage.NEGOTIATION, FunnelStage.CLOSED_WON].includes(l.currentStage)
    ).length;
    const closedWonCount = leads.filter(l => l.currentStage === FunnelStage.CLOSED_WON).length;
    const closedCount = leads.filter(l =>
      [FunnelStage.CLOSED_WON, FunnelStage.CLOSED_LOST].includes(l.currentStage)
    ).length;

    const conversionRates = {
      leadToQualified: leadCount > 0 ? (qualifiedCount / totalLeads) * 100 : 0,
      qualifiedToProposal: qualifiedCount > 0 ? (proposalCount / qualifiedCount) * 100 : 0,
      proposalToClosedWon: proposalCount > 0 ? (closedWonCount / proposalCount) * 100 : 0,
      overallWinRate: closedCount > 0 ? (closedWonCount / closedCount) * 100 : 0,
    };

    // Calculate average time in each stage
    const averageTimeInStage: Record<FunnelStage, number> = {} as any;

    for (const lead of leads) {
      const history = await this.getStageHistory(lead.id);

      for (const record of history) {
        const daysInStage = record.exitedAt
          ? (record.exitedAt.getTime() - record.enteredAt.getTime()) / (1000 * 60 * 60 * 24)
          : (new Date().getTime() - record.enteredAt.getTime()) / (1000 * 60 * 60 * 24);

        averageTimeInStage[record.stage] = (averageTimeInStage[record.stage] || 0) + daysInStage;
      }
    }

    Object.keys(averageTimeInStage).forEach(stage => {
      const count = leads.filter(l => l.currentStage === stage).length;
      if (count > 0) {
        averageTimeInStage[stage as FunnelStage] /= count;
      }
    });

    // Calculate average days to close
    const closedLeads = leads.filter(l =>
      [FunnelStage.CLOSED_WON, FunnelStage.CLOSED_LOST].includes(l.currentStage)
    );

    let totalDaysToClose = 0;
    for (const lead of closedLeads) {
      const history = await this.getStageHistory(lead.id);
      if (history.length > 0) {
        const firstEntry = history[0].enteredAt;
        const lastEntry = history[history.length - 1].exitedAt || new Date();
        totalDaysToClose += (lastEntry.getTime() - firstEntry.getTime()) / (1000 * 60 * 60 * 24);
      }
    }

    const averageDaysToClose = closedLeads.length > 0 ? totalDaysToClose / closedLeads.length : 0;

    return {
      totalLeads,
      totalValue,
      weightedValue,
      conversionRates,
      averageTimeInStage,
      averageDaysToClose,
    };
  }

  private static mapRowToLead(row: any): Lead {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      companyName: row.company_name,
      contactName: row.contact_name,
      email: row.email,
      phone: row.phone,
      leadSource: row.lead_source,
      interestLevel: row.interest_level,
      estimatedValue: row.estimated_value,
      productsInterested: row.products_interested ? JSON.parse(row.products_interested) : [],
      assignedRepId: row.assigned_rep_id,
      currentStage: row.current_stage,
      notes: row.notes,
      convertedToCustomerId: row.converted_to_customer_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
