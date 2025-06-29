#!/usr/bin/env python3
"""
Analyze trace hierarchy in backend logs
"""

import json
import re

# Read the backend log
log_file = "/Users/hughcrt/Developer/lunary/lunary/packages/backend/backend.log"

print("🔍 ANALYZING TRACE HIERARCHY")
print("="*60)

# Read last 2000 lines
with open(log_file, 'r') as f:
    lines = f.readlines()[-2000:]

# Find all events
events = []
current_event = []
in_event = False

for line in lines:
    if '"type":' in line and ('"llm"' in line or '"agent"' in line or '"tool"' in line):
        if current_event:
            events.append(''.join(current_event))
        current_event = [line]
        in_event = True
    elif in_event:
        current_event.append(line)
        if line.strip() in ['},', '}']:
            events.append(''.join(current_event))
            current_event = []
            in_event = False

# Parse events to extract key info
parsed_events = []
for event in events[-50:]:  # Last 50 events
    type_match = re.search(r'"type":\s*"(\w+)"', event)
    runid_match = re.search(r'"runId":\s*"([^"]+)"', event)
    parent_match = re.search(r'"parentRunId":\s*"([^"]+)"', event)
    agent_match = re.search(r'"agent_name":\s*"([^"]+)"', event)
    msg_match = re.search(r'"logfire_msg":\s*"([^"]+)"', event)
    
    if type_match and runid_match:
        parsed_events.append({
            'type': type_match.group(1),
            'runId': runid_match.group(1),
            'parentRunId': parent_match.group(1) if parent_match else None,
            'agent_name': agent_match.group(1) if agent_match else None,
            'logfire_msg': msg_match.group(1) if msg_match else None
        })

# Group by trace (find root agents)
print("\n📊 Recent Traces:")
print("-" * 60)

# Find root agents (no parent)
roots = [e for e in parsed_events if e['type'] == 'agent' and not e['parentRunId']]

for root in roots[-5:]:  # Show last 5 traces
    print(f"\n🔸 Root Agent: {root['agent_name']} (type: {root['type']})")
    print(f"   ID: {root['runId']}")
    
    # Find children
    def print_children(parent_id, indent=1):
        children = [e for e in parsed_events if e['parentRunId'] == parent_id]
        for child in children:
            prefix = "   " * indent
            print(f"{prefix}↳ {child['logfire_msg'] or child['agent_name'] or 'unknown'} (type: {child['type']})")
            print(f"{prefix}  ID: {child['runId']}")
            print_children(child['runId'], indent + 1)
    
    print_children(root['runId'])

# Check for mistyped events
print("\n\n🔍 Checking for mistyped events:")
mistyped = []
for e in parsed_events:
    if e['agent_name'] and e['type'] != 'agent':
        mistyped.append(e)
    if e['logfire_msg'] and 'agent run' in e['logfire_msg'] and e['type'] != 'agent':
        mistyped.append(e)

if mistyped:
    print(f"❌ Found {len(mistyped)} events that should be 'agent' type:")
    for m in mistyped[:5]:
        print(f"   - {m['agent_name'] or m['logfire_msg']} is type '{m['type']}' (should be 'agent')")
else:
    print("✅ All agent events are properly typed!")