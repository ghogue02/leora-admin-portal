# Architecture Decision Records - Wine Enrichment System

## Overview

This document records key architectural decisions made for the Wine Enrichment System, including rationale, alternatives considered, and trade-offs.

---

## ADR-001: Multi-Tiered Search Strategy

**Status**: Accepted

**Date**: 2025-01-20

### Context

We need to enrich 1,879 wine products with accurate tasting notes. Some wines have extensive online documentation, while others have minimal information available.

### Decision

Implement a 4-level fallback hierarchy:
1. **Level 1**: Exact wine match (producer + wine + vintage + region)
2. **Level 2**: Producer + wine style
3. **Level 3**: Varietal + region characteristics
4. **Level 4**: Generic varietal profile

### Rationale

- **Accuracy**: Prioritizes exact information when available
- **Graceful Degradation**: Maintains quality even with limited data
- **Transparency**: Confidence scores indicate data quality
- **Flexibility**: Adapts to varying information availability

### Alternatives Considered

1. **Single-level search only**: Would fail for many wines
2. **Generic templates**: Produces duplicate content
3. **Manual research**: Not scalable for 1,879 products

### Consequences

**Positive**:
- High accuracy for well-documented wines
- Acceptable results for obscure wines
- Clear confidence tracking

**Negative**:
- Increased complexity
- Multiple web searches per product
- Longer processing time

---

## ADR-002: LLM-Based Generation vs Template System

**Status**: Accepted

**Date**: 2025-01-20

### Context

Previous enrichment used static templates, resulting in duplicate content. Need unique, wine-specific descriptions.

### Decision

Use Claude 3.5 Sonnet to generate unique tasting notes based on web research, rather than static templates.

### Rationale

- **Uniqueness**: Each generation is different
- **Context-aware**: Adapts to specific wine characteristics
- **Quality**: Professional sommelier-level descriptions
- **Flexibility**: Handles varying information quality

### Alternatives Considered

1. **Static Templates**: Simple but creates duplicates
2. **Template + Variables**: Limited uniqueness
3. **Human Writers**: Too expensive and slow

### Consequences

**Positive**:
- Unique, high-quality content
- Adapts to wine specifics
- Professional tone

**Negative**:
- API costs (~$0.015/product)
- Processing time (~3-5s per product)
- Requires prompt engineering

**Cost Analysis**:
- 1,879 products × $0.015 = ~$28.19
- Acceptable cost for unique content

---

## ADR-003: Uniqueness Validation Strategy

**Status**: Accepted

**Date**: 2025-01-20

### Context

Must prevent duplicate tasting notes to maintain database quality and customer trust.

### Decision

Implement 3-layer validation:
1. **Exact duplicate detection**: Database query for identical aroma strings
2. **Similarity scoring**: Calculate Levenshtein distance and cosine similarity
3. **Quality checks**: Scan for generic phrases, validate completeness

### Rationale

- **Comprehensive**: Catches exact and near duplicates
- **Quality assurance**: Ensures high-quality output
- **Automated**: No manual review needed
- **Fast**: < 0.5 seconds per validation

### Alternatives Considered

1. **Manual Review**: Too slow for 1,879 products
2. **Exact Match Only**: Misses similar but not identical content
3. **No Validation**: Risks duplicate content

### Consequences

**Positive**:
- Guarantees uniqueness
- Maintains quality standards
- Automated process

**Negative**:
- Additional processing time
- May reject valid content (false positives)
- Requires retry logic

---

## ADR-004: Web Search vs Wine API

**Status**: Accepted

**Date**: 2025-01-20

### Context

Need accurate wine information from external sources. Options include wine APIs (Vivino, Wine.com) or general web search.

### Decision

Use Claude Code's WebFetch tool for general web search, targeting specific wine databases and review sites.

### Rationale

- **No API costs**: WebFetch is free with Claude Code
- **Broader coverage**: Access multiple sources
- **Better quality**: Professional critic reviews vs user-generated
- **Flexibility**: Can search any site

### Alternatives Considered

1. **Vivino API**: Limited free tier, user reviews less authoritative
2. **Wine.com API**: Requires partnership, limited access
3. **Scraping**: Legal/ethical concerns, fragile
4. **Wine Database Services**: Expensive ($500-1000/month)

### Consequences

**Positive**:
- Zero API costs
- Access to authoritative sources
- Flexible search strategy

**Negative**:
- Requires parsing unstructured data
- Rate limiting considerations
- Potential for inconsistent formatting

---

## ADR-005: Batch Processing with Concurrency

**Status**: Accepted

**Date**: 2025-01-20

### Context

Processing 1,879 products sequentially would take 4+ hours. Need to optimize for speed while respecting rate limits.

### Decision

Implement batch processing with controlled concurrency:
- Batch size: 25 products
- Concurrency: 3 parallel requests
- Checkpoints: Every 50 products
- Retry: Up to 3 attempts with exponential backoff

### Rationale

- **Speed**: ~3 seconds per product (effective), ~1.5 hours total
- **Reliability**: Checkpoint system prevents data loss
- **Rate Limit Compliance**: Respects API limits
- **Resilience**: Retry logic handles transient failures

### Alternatives Considered

1. **Sequential Processing**: Simple but slow (4+ hours)
2. **High Concurrency (10+)**: Risks rate limiting
3. **No Checkpoints**: Risk losing progress on failures

### Consequences

**Positive**:
- 3x faster than sequential
- Recoverable from failures
- Respects rate limits

**Negative**:
- More complex implementation
- Requires careful concurrency management
- Checkpoint storage overhead

**Performance Analysis**:
```
Sequential: 1,879 × 8s = 4.2 hours
Concurrent (3): 1,879 × 2.7s = 1.4 hours (66% faster)
```

---

## ADR-006: Database Schema for Enrichment Metadata

**Status**: Accepted

**Date**: 2025-01-20

### Context

Need to track enrichment quality, sources, and confidence for auditing and continuous improvement.

### Decision

Store enrichment metadata in `enrichmentMetadata` JSON field:

```json
{
  "source": "exact-match",
  "confidence": 0.92,
  "sourceUrls": ["https://..."],
  "fallbackLevel": 1,
  "enrichedAt": "2025-01-20T...",
  "enrichedBy": "wine-enrichment-v2",
  "validationScore": 0.88,
  "searchQuery": "...",
  "extractedDetails": {...}
}
```

### Rationale

- **Auditability**: Track enrichment quality
- **Debugging**: Understand why content was generated
- **Improvement**: Identify low-confidence products for review
- **Flexibility**: JSON allows schema evolution

### Alternatives Considered

1. **Separate Metadata Table**: More normalized but adds complexity
2. **No Metadata**: Simpler but loses traceability
3. **Separate Fields**: Less flexible, more migrations

### Consequences

**Positive**:
- Complete audit trail
- Easy to query by confidence
- Supports continuous improvement

**Negative**:
- Increased storage (minimal)
- JSON queries slightly less efficient
- Requires JSON parsing in code

---

## ADR-007: Caching Strategy

**Status**: Accepted

**Date**: 2025-01-20

### Context

Some web searches and LLM calls may be duplicated (e.g., same varietal/region combinations). Caching could reduce costs and improve speed.

### Decision

Implement 3-layer caching:
1. **Search Result Cache**: Hash(producer + wine + vintage) → results (7 days TTL)
2. **LLM Response Cache**: Hash(prompt) → response (30 days TTL)
3. **Varietal Profile Cache**: varietal + region → profile (90 days TTL)

### Rationale

- **Cost Reduction**: Avoid duplicate API calls
- **Speed**: Instant cache hits
- **Reasonable TTLs**: Balance freshness vs hit rate

### Alternatives Considered

1. **No Caching**: Simpler but higher costs
2. **Persistent Caching**: More complex, marginal benefit
3. **Longer TTLs**: Risks stale data

### Consequences

**Positive**:
- ~20% cost reduction (estimated)
- ~20% speed improvement
- Reduced API load

**Negative**:
- Cache management complexity
- Memory overhead
- Potential stale data

**Expected Hit Rates**:
- Search results: 15-20% (similar wines)
- LLM responses: 5-10% (exact duplicates)
- Varietal profiles: 40-50% (many wines share varietals)

---

## ADR-008: Error Handling and Recovery

**Status**: Accepted

**Date**: 2025-01-20

### Context

Enrichment process will encounter errors (rate limits, timeouts, validation failures). Need robust error handling.

### Decision

Implement comprehensive error handling:
- **Retry Logic**: Exponential backoff (1s, 2s, 4s)
- **Checkpoints**: Save progress every 50 products
- **Error Logging**: Detailed logs for debugging
- **Failed Product Queue**: Separate queue for manual review
- **Graceful Degradation**: Lower search level on failures

### Rationale

- **Resilience**: Continues despite failures
- **Debugging**: Detailed error logs
- **Recovery**: Resume from checkpoints
- **Quality**: Failed products can be reviewed

### Alternatives Considered

1. **Fail Fast**: Simple but risks losing progress
2. **Infinite Retry**: Risks infinite loops
3. **No Checkpoints**: Data loss on failures

### Consequences

**Positive**:
- Resilient to transient failures
- Easy to debug and resume
- No data loss

**Negative**:
- More complex implementation
- Requires checkpoint storage
- Retry delays extend processing time

---

## ADR-009: Quality Scoring System

**Status**: Accepted

**Date**: 2025-01-20

### Context

Need objective measure of enrichment quality to identify products needing review.

### Decision

Implement multi-component quality score (0-100):
- **Specificity** (30 points): Unique descriptors, no generic phrases
- **Completeness** (30 points): All required fields, sufficient detail
- **Accuracy** (30 points): Matches varietal/regional profile
- **Confidence** (10 points): Source reliability

Minimum acceptable score: 70/100

### Rationale

- **Objective**: Quantifiable quality measure
- **Comprehensive**: Multiple quality dimensions
- **Actionable**: Identifies products needing review
- **Adjustable**: Thresholds can be tuned

### Alternatives Considered

1. **Binary Pass/Fail**: Too simplistic
2. **Confidence Only**: Doesn't measure content quality
3. **Manual Review**: Not scalable

### Consequences

**Positive**:
- Objective quality measurement
- Identifies low-quality content
- Supports continuous improvement

**Negative**:
- Requires calibration
- May be too strict/lenient initially
- Adds validation overhead

---

## ADR-010: Technology Stack

**Status**: Accepted

**Date**: 2025-01-20

### Context

Need to choose technologies for implementation that integrate with existing codebase.

### Decision

- **Language**: TypeScript
- **Runtime**: Node.js / tsx
- **Database**: PostgreSQL (via Prisma)
- **LLM**: Claude 3.5 Sonnet (Anthropic API)
- **Web Search**: Claude Code WebFetch tool
- **Testing**: Jest
- **Logging**: Winston

### Rationale

- **TypeScript**: Type safety, matches existing codebase
- **Prisma**: Already in use, good ORM
- **Claude 3.5**: Best quality/cost ratio for text generation
- **WebFetch**: Free, integrated with Claude Code
- **Jest**: Standard testing framework

### Alternatives Considered

1. **Python**: Good for ML but not used in codebase
2. **GPT-4**: Good quality but higher cost
3. **Custom Scraping**: Legal/ethical concerns

### Consequences

**Positive**:
- Consistent with existing codebase
- Type safety reduces bugs
- Good developer experience

**Negative**:
- Node.js async complexity
- Prisma can be slow for large queries

---

## Summary of Key Decisions

| Decision | Primary Benefit | Main Trade-off |
|----------|----------------|----------------|
| Multi-tiered search | Accuracy for all wines | Complexity |
| LLM generation | Uniqueness | Cost (~$28) |
| Uniqueness validation | Quality assurance | Processing time |
| Web search | Zero API costs | Unstructured data |
| Batch processing | Speed (3x faster) | Implementation complexity |
| Metadata tracking | Auditability | Storage overhead |
| Caching | 20% cost reduction | Cache management |
| Error handling | Resilience | Code complexity |
| Quality scoring | Objective measurement | Calibration needed |
| TypeScript stack | Type safety | Async complexity |

---

## Future Considerations

### Potential Improvements

1. **Machine Learning**: Train model on wine characteristics
2. **User Feedback**: Collect ratings on tasting notes accuracy
3. **Auto-update**: Periodic re-enrichment for new vintage releases
4. **Image Generation**: AI-generated wine bottle images
5. **Sommelier Review**: Human expert validation for high-value wines

### Scalability

Current architecture supports:
- **10,000+ products**: With minor adjustments to batch size
- **Daily updates**: New products can be enriched automatically
- **Multiple tenants**: Tenant-scoped enrichment

### Maintenance

- **Prompt tuning**: Refine based on quality metrics
- **Source updates**: Add new wine databases as they emerge
- **Quality thresholds**: Adjust based on user feedback

---

## Conclusion

These architectural decisions balance:
- **Quality**: Unique, accurate tasting notes
- **Cost**: ~$35 total for 1,879 products
- **Speed**: ~1.5 hours total processing
- **Reliability**: Checkpoint system and error handling
- **Maintainability**: Clear component boundaries

The system is designed to be:
- **Accurate**: Multi-tiered search finds real information
- **Unique**: LLM generation prevents duplicates
- **Scalable**: Batch processing handles large catalogs
- **Auditable**: Comprehensive metadata tracking
- **Resilient**: Error handling and recovery
