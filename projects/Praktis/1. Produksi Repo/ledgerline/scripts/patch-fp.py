import sys
p = sys.argv[1]
s = open(p).read()

# 1. Add firstPassRate field to DashboardData (before closing };)
old1 = "  slaBreachCount: number;\n  breachesByStage: Array<{ stage: ReviewStage; count: number }>;\n};"
new1 = "  slaBreachCount: number;\n  breachesByStage: Array<{ stage: ReviewStage; count: number }>;\n  firstPassRate: number;\n};"
assert old1 in s, "patch#1 not found"
s = s.replace(old1, new1, 1)

# 2. Add fp calculation after jobsInProgress
old2 = "const jobsInProgress = IN_PROCESS_STATUSES.reduce((acc, s) => acc + (byStatus[s] ?? 0), 0);"
new2 = old2 + "\n\n  // EN-03: first-pass rate\n  const fpApproved = byStatus[\"APPROVED\"] ?? 0;\n  const fpRejected = byStatus[\"REJECTED\"] ?? 0;\n  const fpException = byStatus[\"EXCEPTION\"] ?? 0;\n  const fpTotal = fpApproved + fpRejected + fpException;\n  const firstPassRate = fpTotal > 0 ? Math.round((fpApproved / fpTotal) * 1000) / 10 : 0;"
assert old2 in s, "patch#2 not found"
s = s.replace(old2, new2, 1)

# 3. Add firstPassRate to return
old3 = "    slaBreachCount,\n    breachesByStage: breachesByStage"
new3 = "    slaBreachCount,\n    firstPassRate,\n    breachesByStage: breachesByStage"
assert old3 in s, "patch#3 not found"
s = s.replace(old3, new3, 1)

open(p, "w").write(s)
print("dashboard.ts patched with firstPassRate")
