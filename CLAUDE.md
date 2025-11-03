# Claude Code Configuration - SPARC Development Environment

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 🎯 CRITICAL: Claude Code Task Tool for Agent Execution

**Claude Code's Task tool is the PRIMARY way to spawn agents:**
```javascript
// ✅ CORRECT: Use Claude Code's Task tool for parallel agent execution
[Single Message]:
  Task("Research agent", "Analyze requirements and patterns...", "researcher")
  Task("Coder agent", "Implement core features...", "coder")
  Task("Tester agent", "Create comprehensive tests...", "tester")
  Task("Reviewer agent", "Review code quality...", "reviewer")
  Task("Architect agent", "Design system architecture...", "system-architect")
```

**MCP tools are ONLY for coordination setup:**
- `mcp__claude-flow__swarm_init` - Initialize coordination topology
- `mcp__claude-flow__agent_spawn` - Define agent types for coordination
- `mcp__claude-flow__task_orchestrate` - Orchestrate high-level workflows

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

## Project Overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL EXECUTION:
- **Task tool**: Spawn and run agents concurrently for actual work
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY COORDINATE:
- Swarm initialization (topology setup)
- Agent type definitions (coordination patterns)
- Task orchestration (high-level planning)
- Memory management
- Neural features
- Performance tracking
- GitHub integration

**KEY**: MCP coordinates the strategy, Claude Code's Task tool executes with real agents.

## 🚀 Quick Setup

```bash
# Add MCP servers (Claude Flow required, others optional)
claude mcp add claude-flow npx claude-flow@alpha mcp start
claude mcp add ruv-swarm npx ruv-swarm mcp start  # Optional: Enhanced coordination
claude mcp add flow-nexus npx flow-nexus@latest mcp start  # Optional: Cloud features
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

### Flow-Nexus MCP Tools (Optional Advanced Features)
Flow-Nexus extends MCP capabilities with 70+ cloud-based orchestration tools:

**Key MCP Tool Categories:**
- **Swarm & Agents**: `swarm_init`, `swarm_scale`, `agent_spawn`, `task_orchestrate`
- **Sandboxes**: `sandbox_create`, `sandbox_execute`, `sandbox_upload` (cloud execution)
- **Templates**: `template_list`, `template_deploy` (pre-built project templates)
- **Neural AI**: `neural_train`, `neural_patterns`, `seraphina_chat` (AI assistant)
- **GitHub**: `github_repo_analyze`, `github_pr_manage` (repository management)
- **Real-time**: `execution_stream_subscribe`, `realtime_subscribe` (live monitoring)
- **Storage**: `storage_upload`, `storage_list` (cloud file management)

**Authentication Required:**
- Register: `mcp__flow-nexus__user_register` or `npx flow-nexus@latest register`
- Login: `mcp__flow-nexus__user_login` or `npx flow-nexus@latest login`
- Access 70+ specialized MCP tools for advanced orchestration

## 🚀 Agent Execution Flow with Claude Code

### The Correct Pattern:

1. **Optional**: Use MCP tools to set up coordination topology
2. **REQUIRED**: Use Claude Code's Task tool to spawn agents that do actual work
3. **REQUIRED**: Each agent runs hooks for coordination
4. **REQUIRED**: Batch all operations in single messages

### Example Full-Stack Development:

```javascript
// Single message with all agent spawning via Claude Code's Task tool
[Parallel Agent Execution]:
  Task("Backend Developer", "Build REST API with Express. Use hooks for coordination.", "backend-dev")
  Task("Frontend Developer", "Create React UI. Coordinate with backend via memory.", "coder")
  Task("Database Architect", "Design PostgreSQL schema. Store schema in memory.", "code-analyzer")
  Task("Test Engineer", "Write Jest tests. Check memory for API contracts.", "tester")
  Task("DevOps Engineer", "Setup Docker and CI/CD. Document in memory.", "cicd-engineer")
  Task("Security Auditor", "Review authentication. Report findings via hooks.", "reviewer")
  
  // All todos batched together
  TodoWrite { todos: [...8-10 todos...] }
  
  // All file operations together
  Write "backend/server.js"
  Write "frontend/App.jsx"
  Write "database/schema.sql"
```

## 📋 Agent Coordination Protocol

### Every Agent Spawned via Task Tool MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT WORKFLOW: MCP Coordinates, Claude Code Executes

```javascript
// Step 1: MCP tools set up coordination (optional, for complex tasks)
[Single Message - Coordination Setup]:
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }

// Step 2: Claude Code Task tool spawns ACTUAL agents that do the work
[Single Message - Parallel Agent Execution]:
  // Claude Code's Task tool spawns real agents concurrently
  Task("Research agent", "Analyze API requirements and best practices. Check memory for prior decisions.", "researcher")
  Task("Coder agent", "Implement REST endpoints with authentication. Coordinate via hooks.", "coder")
  Task("Database agent", "Design and implement database schema. Store decisions in memory.", "code-analyzer")
  Task("Tester agent", "Create comprehensive test suite with 90% coverage.", "tester")
  Task("Reviewer agent", "Review code quality and security. Document findings.", "reviewer")
  
  // Batch ALL todos in ONE call
  TodoWrite { todos: [
    {id: "1", content: "Research API patterns", status: "in_progress", priority: "high"},
    {id: "2", content: "Design database schema", status: "in_progress", priority: "high"},
    {id: "3", content: "Implement authentication", status: "pending", priority: "high"},
    {id: "4", content: "Build REST endpoints", status: "pending", priority: "high"},
    {id: "5", content: "Write unit tests", status: "pending", priority: "medium"},
    {id: "6", content: "Integration tests", status: "pending", priority: "medium"},
    {id: "7", content: "API documentation", status: "pending", priority: "low"},
    {id: "8", content: "Performance optimization", status: "pending", priority: "low"}
  ]}
  
  // Parallel file operations
  Bash "mkdir -p app/{src,tests,docs,config}"
  Write "app/package.json"
  Write "app/src/server.js"
  Write "app/tests/server.test.js"
  Write "app/docs/API.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## 🧠 Automatic Learning System (ACTIVE)

**Status:** ✅ Self-Improvement Enabled

Your environment now has **4-component automatic skill improvement** that learns with every task:

### Active Systems:
1. **🪝 Hooks Automation** - Tracks all operations automatically
2. **🧠 ReasoningBank** - 9 RL algorithms learning patterns
3. **✓ Verification** - 0.95 quality threshold with auto-rollback
4. **⚡ Performance Monitor** - Real-time optimization

### What's Being Monitored:
- ✅ **Learning Progress**: Patterns learned, trajectories tracked
- ✅ **Quality Scores**: 0.95+ threshold enforcement
- ✅ **Performance**: 10-20x speedups, token efficiency
- ✅ **Success Rates**: Automatic pattern recognition

### How Learnings Are Used:
The system **automatically applies** learned patterns to make you more productive:
- 🎯 **Pattern Recognition** - Identifies similar tasks and applies proven approaches
- ⚡ **Auto-Optimization** - Uses fastest/best methods from past success
- 💡 **Proactive Suggestions** - Recommends improvements based on history
- 🛡️ **Error Prevention** - Avoids approaches that failed before
- 📈 **Continuous Improvement** - Gets smarter with every task (46% faster avg)

**You don't need to manually use learnings—they're applied automatically!**
See `/docs/HOW_LEARNING_WORKS.md` for detailed examples.

### Automatic Summary on Each Request:
A learning system status summary displays automatically with each request via the `UserPromptSubmit` hook at `scripts/learning-monitor.sh`.

### Monitor Commands (Manual):
```bash
# Detailed memory status
npx claude-flow@alpha agent memory status

# Performance report
npx claude-flow@alpha analysis performance-report

# Verification scores
npx claude-flow@alpha verify truth

# Token usage analysis
npx claude-flow@alpha analysis token-usage
```

### Documentation:
- **📊 Dashboard**: `/docs/LEARNING_DASHBOARD.md` - Real-time monitoring
- **📝 Activation**: `/docs/LEARNING_SYSTEM_ACTIVATION.md` - Full details
- **✅ Summary**: `/docs/ACTIVATION_SUMMARY.md` - Quick reference
- **🔍 Discovery**: `/docs/DISCOVERY_REPORT.md` - Environment analysis

### Learning Data Storage:
```
/memory/
├── reasoningbank/     # Pattern learning (9 algorithms)
├── verification/      # Quality scoring (0.95 threshold)
├── performance/       # Speed optimization
└── sessions/          # Session histories
```

**The system learns automatically—just keep working!** 🚀

---

## 📋 GitHub Workflow & Deployment Rules

### Repository Structure
**Main Repository**: `https://github.com/ghogue02/leora-admin-portal.git`
**Working Directory**: `/Users/greghogue/Leora2/web` (the `web` subdirectory is the actual git repository)
**Branch**: `main` (default branch for PRs and deployments)

### Git Workflow Rules

**CRITICAL**: Always work from the `/web` directory for git operations!

```bash
# ✅ CORRECT: Work from web directory
cd /Users/greghogue/Leora2/web
git status
git add .
git commit -m "message"
git push origin main

# ❌ WRONG: Don't work from parent directory
cd /Users/greghogue/Leora2
git status  # This creates a separate repo!
```

### Commit Message Format

Use descriptive commit messages with the following format:

```
[Brief summary line - present tense]

[Optional detailed description]

Features/Changes:
- Feature 1
- Feature 2

Technical Details:
- Detail 1
- Detail 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Deployment Workflow

**Vercel Deployment**: Automatic on push to main branch

```bash
# Step 1: Commit and push changes
cd web
git add <files>
git commit -m "Descriptive message"
git push origin main

# Step 2: Monitor deployment
vercel ls --scope gregs-projects-61e51c01

# Step 3: Check deployment logs (wait for build)
vercel inspect --logs --wait <deployment-url> --scope gregs-projects-61e51c01

# Step 4: Verify deployment is live
# Look for status: "● Ready" in vercel ls output
```

### Deployment URLs

**Main Production URL**: `https://web-omega-five-81.vercel.app/`
- Use this URL for testing and summaries
- This is the stable production domain

**Preview Deployments Pattern**: `https://web-{hash}-gregs-projects-61e51c01.vercel.app`
- Generated for each commit to main branch
- Check latest deployment with `● Ready` status in `vercel ls` output
- Vercel automatically routes production traffic to latest successful deployment

### Common Git Operations

```bash
# Check current status
git status

# View recent commits
git log --oneline -5

# View uncommitted changes
git diff

# Stage specific files
git add path/to/file1 path/to/file2

# Stage all changes
git add .

# Commit with message
git commit -m "message"

# Push to GitHub
git push origin main

# View remote info
git remote -v
```

### GitHub Safety Rules

1. ❌ NEVER run `git push --force` to main (except for security fixes)
2. ❌ NEVER skip commit hooks with `--no-verify`
3. ❌ NEVER amend commits that have been pushed
4. ✅ ALWAYS check `git status` before committing
5. ✅ ALWAYS review `git diff` before committing
6. ✅ ALWAYS write descriptive commit messages

### 🔐 Security Rules - CRITICAL

**NEVER commit these to GitHub:**

1. ❌ **Passwords** - Use environment variables only
   ```typescript
   // ❌ WRONG
   const password = 'Welcome2024!';

   // ✅ CORRECT
   const password = process.env.DEFAULT_PASSWORD || 'PlaceholderOnly!';
   ```

2. ❌ **API Keys** - Store in `.env` (already in `.gitignore`)
3. ❌ **Database URLs** - Use environment variables
4. ❌ **Private Keys** - Never commit `.pem`, `.key` files
5. ❌ **Tokens** - OAuth, JWT, session tokens
6. ❌ **Credentials** - Email passwords, service accounts

**In Documentation:**
- Use `[REDACTED]` for passwords
- Use `[YOUR_API_KEY]` for API keys
- Use `contact admin for credentials` instead of real values

**If You Accidentally Commit a Secret:**

1. **Immediately change the exposed credential**
2. **Sanitize files** (replace with `[REDACTED]`)
3. **Rewrite Git history**:
   ```bash
   # Create password list
   echo "ExposedPassword123!" > /tmp/remove.txt

   # Scrub from all history
   git filter-repo --replace-text /tmp/remove.txt --force

   # Re-add remote and force push
   git remote add origin https://github.com/USER/REPO.git
   git push origin main --force

   # Clean up
   rm /tmp/remove.txt
   ```

4. **Notify affected parties**
5. **Document the incident**

---

## 🗄️ Database Connection Methods

### Database Information
**Provider**: Supabase PostgreSQL
**Schema Location**: `prisma/schema.prisma`
**Environment Variable**: `DATABASE_URL` (configured in `.env`)

### 🚨 CRITICAL: Always Verify Schema Before Changes

**MANDATORY RULE**: Before writing any database queries or assuming table/field names:

1. **Query the actual schema** using one of these methods:
   ```bash
   # Method 1: Check Prisma schema file
   grep -A 20 "model ModelName" prisma/schema.prisma

   # Method 2: Use MCP Supabase tools
   mcp__wellcrafted-supabase__supabase_describe_table

   # Method 3: Generate fresh Prisma client
   npx prisma generate
   ```

2. **Common Schema Mistakes to Avoid**:
   - User relation: `salesRepProfile` (NOT `salesRep`)
   - SalesRep territory: `territoryName` (NOT `territory`)
   - SalesRep quotas: `weeklyRevenueQuota` (NOT `weeklyQuota`)
   - SalesRep active: `isActive` (NOT `active`)
   - Customer relation: `salesRep` (NOT `salesRepProfile`)
   - User password: `hashedPassword` (NOT `password`)
   - User status: `isActive` (NOT `status`)

3. **Verification Workflow**:
   ```typescript
   // ❌ WRONG: Assuming field names
   const user = await prisma.user.findUnique({
     where: { email: "test@example.com" },
     include: { salesRep: true } // WRONG relation name!
   });

   // ✅ CORRECT: Check schema first, use correct names
   const user = await prisma.user.findUnique({
     where: {
       tenantId_email: { // Compound unique key
         tenantId: TENANT_ID,
         email: "test@example.com"
       }
     },
     include: { salesRepProfile: true } // CORRECT relation name
   });
   ```

4. **Always Test Queries**:
   ```bash
   # Quick test before running full script
   npx tsx -e "import { PrismaClient } from '@prisma/client';
              const prisma = new PrismaClient();
              prisma.salesRep.findFirst().then(r => console.log(Object.keys(r)))"
   ```

### ✅ Verified Working Methods

#### Method 1: Prisma Client (RECOMMENDED - Full Read/Write Access)

**Best for**: All database operations - queries, inserts, updates, deletes

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Connect
await prisma.$connect();

// Read operations
const customers = await prisma.customer.findMany();
const customerCount = await prisma.customer.count();

// Write operations
await prisma.customer.create({ data: { ... } });
await prisma.customer.update({ where: { id }, data: { ... } });
await prisma.customer.delete({ where: { id } });

// Disconnect when done
await prisma.$disconnect();
```

**Test Connection**:
```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.\$connect().then(() => console.log('✅ Connected')).catch(e => console.error('❌ Failed:', e.message)).finally(() => prisma.\$disconnect());"
```

**Status**: ✅ Tested and working (5,064 customers confirmed)

#### Method 2: Supabase MCP Tools (Read-Only Access)

**Best for**: Quick database queries without writing TypeScript

Available MCP Tools:
- `mcp__wellcrafted-supabase__supabase_list_tables` - List all tables
- `mcp__wellcrafted-supabase__supabase_describe_table` - Show table schema
- `mcp__wellcrafted-supabase__supabase_query_table` - Query with filters
- `mcp__wellcrafted-supabase__supabase_count_records` - Count records
- `mcp__wellcrafted-supabase__supabase_search_records` - Full-text search
- `mcp__wellcrafted-supabase__supabase_insert_record` - Insert records
- `mcp__wellcrafted-supabase__supabase_update_records` - Update records
- `mcp__wellcrafted-supabase__supabase_delete_records` - Delete records

**Status**: ✅ Available via MCP

#### Method 3: Prisma CLI Commands

**Best for**: Schema management, migrations, and database maintenance

```bash
# View database schema
npx prisma db pull

# Push schema changes to database
npx prisma db push

# Generate Prisma Client after schema changes
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# View migration status
npx prisma migrate status

# Reset database (DESTRUCTIVE!)
npx prisma migrate reset
```

**Status**: ✅ Working

### ❌ Methods That Don't Work

#### Direct psql Connection
```bash
# ❌ This fails without proper authentication
psql $DATABASE_URL
```

#### Prisma Execute without Schema
```bash
# ❌ This fails - requires --schema flag
npx prisma db execute --stdin <<< "SELECT 1"
```

### Database Connection Best Practices

1. **Always use Prisma Client for application code** - It's type-safe and handles connections automatically
2. **Use MCP tools for quick queries** - Great for exploration and debugging
3. **Always disconnect Prisma Client** - Call `prisma.$disconnect()` when done
4. **Use migrations for schema changes** - Never modify the database directly
5. **Test connections before deployment** - Verify DATABASE_URL is set correctly

### Connection String Format

```
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

**Location**: `.env` file (never commit this!)
**Production**: Configured in Vercel environment variables

---

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- Flow-Nexus Platform: https://flow-nexus.ruv.io (registration required for cloud features)

---

Remember: **Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
