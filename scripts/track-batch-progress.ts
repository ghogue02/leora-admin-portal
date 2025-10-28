#!/usr/bin/env tsx
/**
 * Batch Progress Tracker with State Recovery
 *
 * Tracks real-time progress of wine enrichment batches 78-188
 * Features:
 * - Real-time progress monitoring
 * - Time estimation
 * - Error logging and retry tracking
 * - State persistence for recovery
 * - Checkpoint management
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface BatchState {
  batchNumber: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  wineCount?: number;
  errorCount?: number;
  retryCount?: number;
  lastError?: string;
}

interface ProgressState {
  startBatch: number;
  endBatch: number;
  currentBatch: number;
  startedAt: string;
  lastUpdated: string;
  batches: Record<number, BatchState>;
  totalWines: number;
  processedWines: number;
  successfulBatches: number;
  failedBatches: number;
  totalErrors: number;
}

class BatchProgressTracker {
  private stateFile: string;
  private checkpointDir: string;
  private logFile: string;
  private state: ProgressState;

  constructor(startBatch: number = 78, endBatch: number = 188) {
    this.stateFile = resolve(__dirname, '../data/enrichment-state.json');
    this.checkpointDir = resolve(__dirname, '../data/checkpoints');
    this.logFile = resolve(__dirname, '../logs/enrichment-errors.log');

    // Load existing state or create new
    this.state = this.loadState(startBatch, endBatch);
  }

  private loadState(startBatch: number, endBatch: number): ProgressState {
    if (existsSync(this.stateFile)) {
      try {
        const state = JSON.parse(readFileSync(this.stateFile, 'utf-8'));
        console.log(`📥 Loaded existing state from batch ${state.currentBatch}`);
        return state;
      } catch (error) {
        console.warn('⚠️  Failed to load state, creating new state');
      }
    }

    // Create new state
    const batches: Record<number, BatchState> = {};
    for (let i = startBatch; i <= endBatch; i++) {
      batches[i] = {
        batchNumber: i,
        status: 'pending',
      };
    }

    return {
      startBatch,
      endBatch,
      currentBatch: startBatch,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      batches,
      totalWines: (endBatch - startBatch + 1) * 10, // ~10 wines per batch
      processedWines: 0,
      successfulBatches: 0,
      failedBatches: 0,
      totalErrors: 0,
    };
  }

  saveState() {
    this.state.lastUpdated = new Date().toISOString();
    writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  startBatch(batchNumber: number) {
    this.state.batches[batchNumber] = {
      ...this.state.batches[batchNumber],
      status: 'processing',
      startTime: new Date().toISOString(),
    };
    this.state.currentBatch = batchNumber;
    this.saveState();
  }

  completeBatch(batchNumber: number, wineCount: number) {
    this.state.batches[batchNumber] = {
      ...this.state.batches[batchNumber],
      status: 'completed',
      endTime: new Date().toISOString(),
      wineCount,
    };
    this.state.successfulBatches++;
    this.state.processedWines += wineCount;
    this.saveState();

    // Create checkpoint every 10 batches
    if (batchNumber % 10 === 0) {
      this.createCheckpoint(batchNumber);
    }
  }

  failBatch(batchNumber: number, error: string) {
    const batch = this.state.batches[batchNumber];
    batch.status = 'failed';
    batch.endTime = new Date().toISOString();
    batch.lastError = error;
    batch.errorCount = (batch.errorCount || 0) + 1;

    this.state.failedBatches++;
    this.state.totalErrors++;
    this.saveState();

    // Log error
    this.logError(batchNumber, error);
  }

  retryBatch(batchNumber: number) {
    const batch = this.state.batches[batchNumber];
    batch.retryCount = (batch.retryCount || 0) + 1;
    batch.status = 'pending';
    this.saveState();
  }

  private createCheckpoint(batchNumber: number) {
    const checkpointFile = resolve(this.checkpointDir, `batch-${batchNumber}-complete.json`);
    const checkpoint = {
      batchNumber,
      timestamp: new Date().toISOString(),
      successfulBatches: this.state.successfulBatches,
      failedBatches: this.state.failedBatches,
      processedWines: this.state.processedWines,
    };

    writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));
    console.log(`💾 Checkpoint created: batch ${batchNumber}`);
  }

  private logError(batchNumber: number, error: string) {
    const logEntry = `[${new Date().toISOString()}] Batch ${batchNumber}: ${error}\n`;
    writeFileSync(this.logFile, logEntry, { flag: 'a' });
  }

  getProgress() {
    const totalBatches = this.state.endBatch - this.state.startBatch + 1;
    const completedBatches = this.state.successfulBatches;
    const progressPercent = ((completedBatches / totalBatches) * 100).toFixed(1);

    // Calculate time estimates
    const startTime = new Date(this.state.startedAt).getTime();
    const currentTime = Date.now();
    const elapsedMs = currentTime - startTime;
    const elapsedMinutes = elapsedMs / 1000 / 60;

    const avgMinutesPerBatch = completedBatches > 0 ? elapsedMinutes / completedBatches : 10;
    const remainingBatches = totalBatches - completedBatches;
    const estimatedMinutesRemaining = remainingBatches * avgMinutesPerBatch;
    const estimatedHoursRemaining = (estimatedMinutesRemaining / 60).toFixed(1);

    return {
      currentBatch: this.state.currentBatch,
      totalBatches,
      completedBatches,
      failedBatches: this.state.failedBatches,
      progressPercent,
      processedWines: this.state.processedWines,
      totalWines: this.state.totalWines,
      elapsedMinutes: elapsedMinutes.toFixed(1),
      avgMinutesPerBatch: avgMinutesPerBatch.toFixed(1),
      estimatedHoursRemaining,
      successRate: ((completedBatches / (completedBatches + this.state.failedBatches)) * 100).toFixed(1),
    };
  }

  displayProgress() {
    const progress = this.getProgress();

    console.log(`\n🍷 WINE ENRICHMENT PROGRESS`);
    console.log(`===========================\n`);
    console.log(`📊 Current Status:`);
    console.log(`   Current Batch: ${progress.currentBatch}`);
    console.log(`   Completed: ${progress.completedBatches}/${progress.totalBatches} (${progress.progressPercent}%)`);
    console.log(`   Failed: ${progress.failedBatches}`);
    console.log(`   Success Rate: ${progress.successRate}%\n`);

    console.log(`🍇 Wines Processed:`);
    console.log(`   ${progress.processedWines}/${progress.totalWines} wines\n`);

    console.log(`⏱️  Time Estimates:`);
    console.log(`   Elapsed: ${progress.elapsedMinutes} minutes`);
    console.log(`   Avg per Batch: ${progress.avgMinutesPerBatch} minutes`);
    console.log(`   Estimated Remaining: ${progress.estimatedHoursRemaining} hours\n`);

    // Show progress bar
    const barLength = 50;
    const filledLength = Math.round((parseInt(progress.progressPercent) / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(`   [${bar}] ${progress.progressPercent}%\n`);

    return progress;
  }

  getNextBatch(): number | null {
    for (let i = this.state.currentBatch; i <= this.state.endBatch; i++) {
      const batch = this.state.batches[i];
      if (batch.status === 'pending' || (batch.status === 'failed' && (batch.retryCount || 0) < 3)) {
        return i;
      }
    }
    return null;
  }

  isComplete(): boolean {
    return this.state.successfulBatches === (this.state.endBatch - this.state.startBatch + 1);
  }

  generateReport(): string {
    const progress = this.getProgress();

    return `
# Wine Enrichment Completion Report

**Generated:** ${new Date().toISOString()}
**Status:** ${this.isComplete() ? '✅ COMPLETE' : '⏳ IN PROGRESS'}

## Summary

- **Total Batches:** ${progress.totalBatches}
- **Completed:** ${progress.completedBatches}
- **Failed:** ${progress.failedBatches}
- **Success Rate:** ${progress.successRate}%
- **Wines Processed:** ${progress.processedWines}/${progress.totalWines}

## Timeline

- **Started:** ${this.state.startedAt}
- **Elapsed Time:** ${progress.elapsedMinutes} minutes
- **Average per Batch:** ${progress.avgMinutesPerBatch} minutes
- **Estimated Completion:** ${progress.estimatedHoursRemaining} hours remaining

## Batch Details

${Object.values(this.state.batches)
  .filter(b => b.status === 'failed')
  .map(b => `- Batch ${b.batchNumber}: ${b.status} (${b.errorCount || 0} errors, ${b.retryCount || 0} retries)`)
  .join('\n')}

## Next Steps

${this.isComplete()
  ? '✅ All batches completed! Ready to apply enrichment results to database.'
  : `⏳ Continue processing from batch ${this.getNextBatch()}`
}
`;
  }
}

// CLI Usage
if (require.main === module) {
  const tracker = new BatchProgressTracker();

  const command = process.argv[2];

  if (command === 'show' || !command) {
    tracker.displayProgress();
  } else if (command === 'report') {
    console.log(tracker.generateReport());
  } else if (command === 'next') {
    const nextBatch = tracker.getNextBatch();
    console.log(nextBatch ? `Next batch: ${nextBatch}` : 'All batches completed!');
  } else {
    console.log('Usage: npx tsx track-batch-progress.ts [show|report|next]');
  }
}

export default BatchProgressTracker;
