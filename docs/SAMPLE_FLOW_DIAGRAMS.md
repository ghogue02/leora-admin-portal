# Sample Management Flow Diagrams

Visual diagrams for understanding Phase 3 workflows using Mermaid.

---

## Sample Assignment Flow

```mermaid
graph TD
    A[Sales Rep Visits Customer] --> B[Customer Tastes Sample]
    B --> C[Rep Opens Leora App]
    C --> D[Navigate to Customer Page]
    D --> E[Click Log Sample Usage]
    E --> F[Fill Sample Form]
    F --> G{Sample Form}
    G -->|Customer| H[Select Customer]
    G -->|Product| I[Select SKU]
    G -->|Quantity| J[Enter Quantity]
    G -->|Date| K[Confirm Tasted Date]
    G -->|Feedback| L[Add Feedback Notes]
    G -->|Follow-up?| M[Check if Follow-up Needed]
    H --> N[Save Sample]
    I --> N
    J --> N
    K --> N
    L --> N
    M --> N
    N --> O[Create SampleUsage Record]
    O --> P[Deduct from Sample Budget]
    P --> Q[Create Activity Log]
    Q --> R{Needs Follow-up?}
    R -->|Yes| S[Mark for Follow-up]
    R -->|No| T[Complete]
    S --> T
    T --> U[Sample Logged Successfully]
```

---

## Sample Conversion Tracking Flow

```mermaid
graph TD
    A[Sample Given to Customer] --> B[SampleUsage Created]
    B --> C[30-Day Attribution Window Starts]
    C --> D{Customer Places Order?}
    D -->|No Order in 30 Days| E[Sample Stays Unconverted]
    D -->|Order Placed| F[Check Order Line Items]
    F --> G{Contains Sampled SKU?}
    G -->|No| E
    G -->|Yes| H{Within 30 Days?}
    H -->|No| E
    H -->|Yes| I[Mark Sample as Converted]
    I --> J[Calculate Revenue Attribution]
    J --> K[Update Sample Metrics]
    K --> L[Update Rep Performance]
    L --> M[Conversion Complete]

    E --> N[Trigger May Fire]
    N --> O{Sample No Order Trigger Enabled?}
    O -->|Yes| P[Create Follow-up Task]
    O -->|No| Q[No Action]
    P --> R[Sales Rep Follows Up]
    R --> S{Customer Orders?}
    S -->|Yes| I
    S -->|No| E
```

---

## Sample Analytics Calculation Flow

```mermaid
graph TD
    A[Daily Cron Job Runs] --> B[Select Date Range]
    B --> C[Get All Samples in Range]
    C --> D[Group Samples by SKU]
    D --> E[For Each SKU]
    E --> F[Count Total Samples]
    F --> G[Check Customer Orders]
    G --> H{Order Contains SKU?}
    H -->|Yes| I{Within 30-Day Window?}
    H -->|No| J[Not Converted]
    I -->|Yes| K[Mark as Converted]
    I -->|No| J
    K --> L[Sum Order Revenue]
    L --> M[Calculate Metrics]
    M --> N[Conversion Rate]
    M --> O[Revenue Attributed]
    M --> P[Avg Order Size]
    M --> Q[ROI]
    N --> R[Store in SampleMetrics Table]
    O --> R
    P --> R
    Q --> R
    R --> S[Update Analytics Dashboard]
    J --> T[Update Non-Conversion Count]
    T --> R
```

---

## Trigger Processing Workflow

```mermaid
graph TD
    A[Cron Job Every 6 Hours] --> B[Get All Active Triggers]
    B --> C{For Each Trigger}
    C --> D{Trigger Type?}

    D -->|Sample No Order| E[Get Samples X Days Old]
    E --> F{Sample Converted?}
    F -->|Yes| G[Skip]
    F -->|No| H{Follow-up Task Exists?}
    H -->|Yes| G
    H -->|No| I[Create Follow-up Task]

    D -->|First Order| J[Get New Orders Today]
    J --> K{Is First Order?}
    K -->|Yes| L{Thank You Task Exists?}
    K -->|No| G
    L -->|Yes| G
    L -->|No| M[Create Thank You Task]

    D -->|Customer Timing| N[Analyze Order Frequency]
    N --> O{Re-order Due Soon?}
    O -->|Yes| P{Recent Contact?}
    O -->|No| G
    P -->|No| Q[Create Proactive Task]
    P -->|Yes| G

    D -->|Burn Rate| R[Calculate Order Frequency]
    R --> S{Frequency Declined >30%?}
    S -->|Yes| T{High-Priority Task Exists?}
    S -->|No| G
    T -->|No| U[Create Urgent Visit Task]
    T -->|Yes| G

    I --> V[Log Trigger Execution]
    M --> V
    Q --> V
    U --> V
    G --> V
    V --> W[Trigger Processing Complete]
```

---

## AI Recommendation Generation Flow

```mermaid
graph TD
    A[User Clicks Get Recommendations] --> B[Frontend Sends Request]
    B --> C[API Receives Request]
    C --> D[Gather Customer Context]
    D --> E[Get Purchase History]
    D --> F[Get Sample Tastings]
    D --> G[Get Customer Notes]
    D --> H[Get Current Order Items]
    E --> I[Build Prompt]
    F --> I
    G --> I
    H --> I
    I --> J[Call Anthropic Claude API]
    J --> K[Claude Analyzes Context]
    K --> L[Generate Recommendations]
    L --> M[Parse AI Response]
    M --> N{Valid JSON?}
    N -->|No| O[Return Error]
    N -->|Yes| P[Extract Recommendations]
    P --> Q[For Each Recommendation]
    Q --> R[Check Stock Availability]
    R --> S{In Stock?}
    S -->|No| T[Filter Out]
    S -->|Yes| U[Add to Results]
    T --> V[Continue]
    U --> V
    V --> W{More Recommendations?}
    W -->|Yes| Q
    W -->|No| X[Rank by Confidence]
    X --> Y[Return Top 5 Recommendations]
    Y --> Z[Display to User]
    Z --> AA{User Action?}
    AA -->|Add to Order| AB[Add Product to Cart]
    AA -->|Thumbs Up| AC[Log Positive Feedback]
    AA -->|Thumbs Down| AD[Log Negative Feedback]
    AA -->|Dismiss| AE[No Action]
    AC --> AF[Train AI Model]
    AD --> AF
```

---

## Complete Phase 3 System Architecture

```mermaid
graph TB
    subgraph "Frontend"
        A[Sample Management UI]
        B[Analytics Dashboard]
        C[AI Recommendations UI]
        D[Trigger Settings UI]
    end

    subgraph "API Layer"
        E[Sample API]
        F[Analytics API]
        G[Recommendations API]
        H[Trigger Admin API]
    end

    subgraph "Business Logic"
        I[Sample Service]
        J[Analytics Calculator]
        K[Recommendation Engine]
        L[Trigger Processor]
    end

    subgraph "External Services"
        M[Anthropic Claude API]
        N[Email Service]
    end

    subgraph "Database"
        O[(SampleUsage)]
        P[(SampleMetrics)]
        Q[(Trigger)]
        R[(Task)]
        S[(Customer)]
        T[(Order)]
        U[(SKU)]
    end

    subgraph "Background Jobs"
        V[Sample Metrics Calculation]
        W[Trigger Processing]
    end

    A --> E
    B --> F
    C --> G
    D --> H

    E --> I
    F --> J
    G --> K
    H --> L

    I --> O
    I --> S
    I --> U

    J --> O
    J --> T
    J --> P

    K --> M
    K --> S
    K --> T
    K --> O

    L --> Q
    L --> R
    L --> O
    L --> S

    V --> J
    W --> L

    L --> N
```

---

## User Journey: From Sample to Order

```mermaid
journey
    title Customer Sample to Order Journey
    section Sample Distribution
      Sales rep visits customer: 5: Rep
      Customer tastes wine: 5: Customer, Rep
      Rep logs sample in Leora: 4: Rep
      System records sample: 5: System
    section Waiting Period
      Customer considers purchase: 3: Customer
      Trigger fires (Day 7): 5: System
      Rep receives follow-up task: 4: Rep
      Rep calls customer: 4: Rep, Customer
    section Order Placement
      Customer decides to order: 5: Customer
      Rep creates order: 5: Rep
      AI suggests complementary products: 5: System, Rep
      Rep adds AI recommendations: 4: Rep
      Order submitted: 5: Rep, Customer
    section Attribution
      System matches order to sample: 5: System
      Sample marked as converted: 5: System
      Revenue attributed: 5: System
      Analytics updated: 5: System
```

---

## Sample Budget Tracking

```mermaid
stateDiagram-v2
    [*] --> BudgetAllocated: Month Starts
    BudgetAllocated --> BudgetUsed: Sample Logged
    BudgetUsed --> BudgetUsed: More Samples Logged
    BudgetUsed --> BudgetExceeded: Over Allowance
    BudgetUsed --> BudgetAllocated: Month Ends
    BudgetExceeded --> BudgetExceeded: Block New Samples
    BudgetExceeded --> BudgetAllocated: Month Ends
    BudgetAllocated --> [*]: Year Ends

    note right of BudgetAllocated
      Monthly Allowance: 60 bottles
      Remaining: 60
    end note

    note right of BudgetUsed
      Monthly Allowance: 60 bottles
      Used: 35
      Remaining: 25
    end note

    note right of BudgetExceeded
      Monthly Allowance: 60 bottles
      Used: 62
      Remaining: 0
      Status: BLOCKED
    end note
```

---

## Conversion Attribution State Machine

```mermaid
stateDiagram-v2
    [*] --> SampleGiven: Log Sample
    SampleGiven --> PendingConversion: Within 30 Days
    PendingConversion --> Converted: Order Placed (Same SKU)
    PendingConversion --> NotConverted: 30 Days Elapsed
    PendingConversion --> TriggerFired: Sample No Order (Day 7)
    TriggerFired --> PendingConversion: Still Within Window
    TriggerFired --> Converted: Order After Follow-up
    TriggerFired --> NotConverted: No Order After Follow-up
    Converted --> [*]: Final State
    NotConverted --> [*]: Final State

    note right of SampleGiven
      Sample logged at Day 0
      Attribution window: 30 days
    end note

    note right of TriggerFired
      Day 7: Follow-up task created
      Rep calls customer
    end note

    note right of Converted
      Revenue attributed
      Metrics updated
      Rep credited
    end note
```

---

## Trigger Decision Tree

```mermaid
graph TD
    A{Trigger Processing Runs} --> B{Check Sample No Order}
    B --> C{Sample X Days Old?}
    C -->|Yes| D{Converted?}
    C -->|No| Z[Next Trigger]
    D -->|Yes| Z
    D -->|No| E{Task Exists?}
    E -->|Yes| Z
    E -->|No| F[Create Task]

    Z --> G{Check First Order}
    G --> H{New Order Today?}
    H -->|Yes| I{First Ever?}
    H -->|No| Z2[Next Trigger]
    I -->|Yes| J{Thank You Task?}
    I -->|No| Z2
    J -->|No| K[Create Task]
    J -->|Yes| Z2

    Z2 --> L{Check Customer Timing}
    L --> M{Analyze Frequency}
    M --> N{Re-order Due?}
    N -->|Yes| O{Recent Contact?}
    N -->|No| Z3[Next Trigger]
    O -->|No| P[Create Task]
    O -->|Yes| Z3

    Z3 --> Q{Check Burn Rate}
    Q --> R{Calculate Frequency}
    R --> S{Declined >30%?}
    S -->|Yes| T{Urgent Task?}
    S -->|No| U[End]
    T -->|No| V[Create Task]
    T -->|Yes| U

    F --> U
    K --> U
    P --> U
    V --> U
```

---

## Rep Performance Calculation

```mermaid
graph LR
    A[Rep Activity Data] --> B[Sample Metrics]
    A --> C[Order Metrics]
    A --> D[Activity Metrics]

    B --> E[Samples Distributed]
    B --> F[Conversions]
    B --> G[Conversion Rate]
    B --> H[Revenue from Samples]

    C --> I[Total Orders]
    C --> J[Total Revenue]
    C --> K[Avg Order Value]

    D --> L[Calls Made]
    D --> M[Visits Completed]
    D --> N[Follow-up Rate]

    E --> O[Performance Score]
    F --> O
    G --> O
    H --> O
    I --> O
    J --> O
    K --> O
    L --> O
    M --> O
    N --> O

    O --> P[Rep Leaderboard Ranking]
```

---

## Data Flow: Sample to Analytics

```mermaid
sequenceDiagram
    participant Rep as Sales Rep
    participant UI as Frontend
    participant API as API Server
    participant DB as Database
    participant Job as Cron Job
    participant Dashboard as Analytics UI

    Rep->>UI: Log Sample
    UI->>API: POST /api/samples/quick-assign
    API->>DB: INSERT INTO SampleUsage
    DB-->>API: Sample Created
    API-->>UI: Success
    UI-->>Rep: Sample Logged

    Note over Job: Daily at 2:00 AM
    Job->>DB: SELECT Samples (30 days)
    Job->>DB: SELECT Orders (30 days)
    Job->>Job: Calculate Metrics
    Job->>DB: INSERT/UPDATE SampleMetrics
    DB-->>Job: Metrics Saved

    Rep->>Dashboard: View Analytics
    Dashboard->>API: GET /api/samples/analytics
    API->>DB: SELECT FROM SampleMetrics
    DB-->>API: Pre-calculated Metrics
    API-->>Dashboard: Analytics Data
    Dashboard-->>Rep: Charts & Graphs
```

---

## Mobile Sample Logging Flow

```mermaid
graph TD
    A[Rep in Field] --> B{Has Internet?}
    B -->|Yes| C[Open Leora App]
    B -->|No| D[Open Offline Mode]

    C --> E[Navigate to Customer]
    D --> E

    E --> F[Click Log Sample]
    F --> G[Fill Form]
    G --> H{Use Voice Input?}
    H -->|Yes| I[Tap Microphone Icon]
    H -->|No| J[Type Feedback]

    I --> K[Speak Feedback]
    K --> L[Speech to Text]
    L --> M[Review Transcription]
    M --> N[Edit if Needed]
    N --> O[Save Sample]

    J --> O

    O --> P{Online?}
    P -->|Yes| Q[Send to Server]
    P -->|No| R[Save Locally]

    Q --> S[Server Processes]
    S --> T[Confirmation]

    R --> U[Queue for Sync]
    U --> V{Connection Restored?}
    V -->|Yes| W[Auto Sync]
    V -->|No| X[Wait]
    X --> V

    W --> Q
```

---

## Legend

**Diagram Types Used**:
- **Flowchart** (`graph`): Process flows and decision trees
- **Sequence Diagram** (`sequenceDiagram`): System interactions over time
- **State Diagram** (`stateDiagram`): State transitions
- **Journey Map** (`journey`): User experience flows

**Common Symbols**:
- **Rectangle**: Process step
- **Diamond**: Decision point
- **Circle**: Start/End point
- **Arrows**: Flow direction
- **Subgraph**: Grouped components

---

## Using These Diagrams

These diagrams can be rendered in:
- **Markdown viewers** that support Mermaid
- **GitHub** (native Mermaid support)
- **VS Code** (with Mermaid extension)
- **Documentation sites** (MkDocs, Docusaurus, etc.)
- **Mermaid Live Editor**: https://mermaid.live

---

**Document Version**: 1.0
**Last Updated**: October 25, 2024
**Maintained by**: Technical Documentation Team
