# 🎯 Active Learning Hooks

This directory contains Claude Code hooks that enable **real-time learning capture** and **mid-session progress tracking**.

## 📋 Active Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `session-start.hook` | Session start | Initialize tracking, show historical data |
| `post-tool-use.hook` | After each tool | Track progress, show updates every 5 steps |
| `post-task.hook` | Task completion | Store trajectory, capture learning |
| `session-end.hook` | Session end | Generate comprehensive summary |

## 🔧 How They Work

### Automatic Execution
Claude Code automatically runs these hooks at the appropriate times. **You don't need to do anything!**

### Data Storage
All learning data is stored in `/memory/`:
- `reasoningbank/trajectories/` - Task execution records
- `reasoningbank/patterns/` - Learned patterns
- `sessions/` - Session tracking data

### Progress Visibility
You'll see real-time updates like:
```
🔄 Progress Update: Step 15 | Last tool: Prisma Query (success)
```

And task completion summaries:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Learning Captured
📝 Task: Database analysis
🎯 Quality Score: 0.96
📊 Total Trajectories: 48 (↑ new)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🧪 Testing

To verify hooks are working:
```bash
# Check they're executable
ls -la .claude/hooks/

# Test post-task hook
CLAUDE_TASK_ID="test" CLAUDE_TASK_DESCRIPTION="Testing" CLAUDE_QUALITY_SCORE="0.95" ./.claude/hooks/post-task.hook

# Verify trajectory was created
ls -la ../memory/reasoningbank/trajectories/
```

## 📖 Full Documentation

See `/docs/LEARNING_HOOKS_ACTIVE.md` for complete documentation.

## ✅ Status: OPERATIONAL

All hooks are active and capturing learning data automatically! 🎉
